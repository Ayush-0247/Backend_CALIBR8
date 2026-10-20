import jwt from "jsonwebtoken";
import prisma from "../config/db.js";
import { ApiError } from "../utils/ApiError.js";

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
        client_id: process.env.GITHUB_CLIENT_ID || "demo-github-client-id",
        redirect_uri: redirectUri("github"),
        scope: "read:user user:email",
        state,
      });
      return `https://github.com/login/oauth/authorize?${params.toString()}`;
    },
    async fetchProfile(code) {
      if (!process.env.GITHUB_CLIENT_ID || !process.env.GITHUB_CLIENT_SECRET) {
        // Return dummy profile if credentials are not configured
        return {
          providerUserId: "demo-gh-user-12345",
          username: "octocat-demo",
          name: "Octocat Demo",
          email: "octocat@github.dev",
          avatarUrl: "https://github.com/identicons/octocat.png",
          profileUrl: "https://github.com/octocat-demo",
          bio: "GitHub demo user in AI Studio",
          headline: null,
          stats: {
            publicRepos: 12,
            followers: 42,
            following: 10,
          },
        };
      }

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
      if (!token.access_token) {
        throw new ApiError(
          400,
          token.error_description || "GitHub token exchange failed",
        );
      }

      const headers = {
        Authorization: `Bearer ${token.access_token}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "calibr8",
      };

      const gh = await (
        await fetch("https://api.github.com/user", { headers })
      ).json();
      if (!gh.id) throw new ApiError(400, "Could not read GitHub profile.");

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

const getProvider = (name) => providers[String(name).toLowerCase()] || null;

/**
 * Generate OAuth authorization URL
 */
export const getProviderAuthUrl = (providerName, userId) => {
  const provider = getProvider(providerName);
  if (!provider) {
    throw new ApiError(404, `Unknown OAuth provider '${providerName}'.`);
  }

  const state = jwt.sign(
    { userId, provider: providerName },
    stateSecret(),
    { expiresIn: "10m" },
  );

  return provider.authorizeUrl(state);
};

/**
 * Handle incoming OAuth callback
 */
export const processOAuthCallback = async (providerName, query) => {
  const { code, state, error } = query;

  if (error || !code || !state) {
    return {
      success: false,
      redirect: `${frontendUrl()}/?link_error=${encodeURIComponent("Linking was cancelled or failed.")}`,
    };
  }

  let payload;
  try {
    payload = jwt.verify(String(state), stateSecret());
  } catch {
    return {
      success: false,
      redirect: `${frontendUrl()}/?link_error=${encodeURIComponent("Link request expired. Please try again.")}`,
    };
  }

  const provider = getProvider(providerName);
  if (!provider) {
    return {
      success: false,
      redirect: `${frontendUrl()}/?link_error=${encodeURIComponent("Unknown provider.")}`,
    };
  }

  try {
    const profile = await provider.fetchProfile(String(code));

    const existing = await prisma.socialAccount.findUnique({
      where: {
        provider_providerUserId: {
          provider: providerName,
          providerUserId: profile.providerUserId,
        },
      },
    });

    if (existing && existing.userId !== payload.userId) {
      return {
        success: false,
        redirect: `${frontendUrl()}/?link_error=${encodeURIComponent(`This ${providerName} account is already linked to another user.`)}`,
      };
    }

    await prisma.socialAccount.upsert({
      where: {
        userId_provider: {
          userId: payload.userId,
          provider: providerName,
        },
      },
      create: {
        userId: payload.userId,
        provider: providerName,
        ...profile,
      },
      update: {
        ...profile,
        connectedAt: new Date(),
      },
    });

    return {
      success: true,
      redirect: `${frontendUrl()}/?linked=${providerName}`,
    };
  } catch (err) {
    console.error(`[Social Service] ${providerName} callback error:`, err);
    return {
      success: false,
      redirect: `${frontendUrl()}/?link_error=${encodeURIComponent(err.message || "Could not link account.")}`,
    };
  }
};

/**
 * Unlink social account provider from user
 */
export const unlinkSocialAccount = async (userId, providerName) => {
  const count = await prisma.socialAccount.deleteMany({
    where: {
      userId,
      provider: providerName,
    },
  });

  return { success: true, count };
};

/**
 * GET /api/social/:provider/link-url
 * Returns authorization URL for linking external social account (Protected)
 */
export const getLinkUrl = (req, res, next) => {
  try {
    const url = getProviderAuthUrl(req.params.provider, req.user.id);
    res.status(200).json({ url });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/social/:provider/callback
 * OAuth redirect callback handler
 */
export const handleCallback = async (req, res, next) => {
  try {
    const result = await processOAuthCallback(req.params.provider, req.query);
    res.redirect(result.redirect);
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/social/:provider
 * Unlink social provider from the authenticated user (Protected)
 */
export const unlinkProvider = async (req, res, next) => {
  try {
    const result = await unlinkSocialAccount(req.user.id, req.params.provider);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};
