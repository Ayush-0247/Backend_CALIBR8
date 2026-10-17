import { Router } from "express";
import jwt from "jsonwebtoken";
import prisma from "../config/db.js";
import { protect } from "../middlewares/auth.middleware.js";

const router = Router();

const frontendUrl = () => process.env.FRONTEND_URL || "http://localhost:5173";
const backendUrl = () => process.env.BACKEND_URL || "http://localhost:3000";
const stateSecret = () =>
  process.env.OAUTH_STATE_SECRET ||
  process.env.JWT_SECRET ||
  "fallback-secret-change-me";
const redirectUri = (provider) =>
  `${backendUrl()}/api/social/${provider}/callback`;

const providers = {
  github: {
    authorizeUrl(state) {
      const params = new URLSearchParams({
        client_id: process.env.GITHUB_CLIENT_ID,
        redirect_uri: redirectUri("github"),
        scope: "read:user user:email",
        state,
      });
      return `https://github.com/login/oauth/authorize?${params}`;
    },
    async fetchProfile(code) {
      const tokenRes = await fetch(
        "https://github.com/login/oauth/access_token",
        {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            client_id: process.env.GITHUB_CLIENT_ID,
            client_secret: process.env.GITHUB_CLIENT_SECRET,
            code,
            redirect_uri: redirectUri("github"),
          }),
        },
      );
      const token = await tokenRes.json();
      if (!token.access_token)
        throw new Error(
          token.error_description || "GitHub token exchange failed",
        );

      const headers = {
        Authorization: `Bearer ${token.access_token}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "calibr8",
      };

      const gh = await (
        await fetch("https://api.github.com/user", { headers })
      ).json();
      if (!gh.id) throw new Error("Could not read GitHub profile");

      let email = gh.email;
      if (!email) {
        const emails = await (
          await fetch("https://api.github.com/user/emails", { headers })
        ).json();
        email = Array.isArray(emails)
          ? emails.find((e) => e.primary && e.verified)?.email
          : null;
      }

      return {
        providerUserId: String(gh.id),
        username: gh.login,
        name: gh.name || gh.login,
        email: email ?? null,
        avatarUrl: gh.avatar_url,
        profileUrl: gh.html_url,
        bio: gh.bio ?? null,
        headline: null,
        stats: {
          publicRepos: gh.public_repos,
          followers: gh.followers,
          following: gh.following,
        },
      };
    },
  },
};

const getProvider = (name) => providers[name] || null;

// 1. Get link URL
router.get("/:provider/link-url", protect, (req, res) => {
  const provider = getProvider(req.params.provider);
  if (!provider) return res.status(404).json({ message: "Unknown provider" });
  const state = jwt.sign(
    { userId: req.user.id, provider: req.params.provider },
    stateSecret(),
    { expiresIn: "10m" },
  );
  res.json({ url: provider.authorizeUrl(state) });
});

// 2. Callback
router.get("/:provider/callback", async (req, res) => {
  const name = req.params.provider;
  const { code, state, error } = req.query;
  const fail = (msg) =>
    res.redirect(`${frontendUrl()}/?link_error=${encodeURIComponent(msg)}`);
  const provider = getProvider(name);
  if (!provider) return fail("Unknown provider.");
  if (error || !code || !state) return fail("Linking was cancelled.");
  let payload;
  try {
    payload = jwt.verify(String(state), stateSecret());
  } catch {
    return fail("Link request expired. Please try again.");
  }
  try {
    const profile = await provider.fetchProfile(String(code));
    const existing = await prisma.socialAccount.findUnique({
      where: {
        provider_providerUserId: {
          provider: name,
          providerUserId: profile.providerUserId,
        },
      },
    });
    if (existing && existing.userId !== payload.userId)
      return fail(`This ${name} account is already linked to another user.`);
    await prisma.socialAccount.upsert({
      where: { userId_provider: { userId: payload.userId, provider: name } },
      create: { userId: payload.userId, provider: name, ...profile },
      update: { ...profile, connectedAt: new Date() },
    });
    res.redirect(`${frontendUrl()}/?linked=${name}`);
  } catch (err) {
    console.error(`[social] ${name} link failed:`, err);
    fail(`Could not link ${name}. Please try again.`);
  }
});

// 3. Unlink
router.delete("/:provider", protect, async (req, res) => {
  await prisma.socialAccount.deleteMany({
    where: { userId: req.user.id, provider: req.params.provider },
  });
  res.json({ success: true });
});

export default router;
