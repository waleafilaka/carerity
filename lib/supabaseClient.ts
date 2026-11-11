import {
  createClient,
  SupabaseClient,
  User,
} from "@supabase/supabase-js";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL;

const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_URL is not configured."
  );
}

if (!supabaseAnonKey) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_ANON_KEY is not configured."
  );
}

export const supabaseProjectRef =
  new URL(
    supabaseUrl
  ).hostname.split(".")[0];

/*
 * ============================================================
 * AUTH WORKSPACES
 * ============================================================
 */

export type CarerityAuthWorkspace =
  | "customer"
  | "caregiver"
  | "admin";

/*
 * ============================================================
 * WORKSPACE STORAGE KEYS
 * ============================================================
 *
 * These keys MUST remain different.
 *
 * Customer:
 * carerity-<project>-customer-auth
 *
 * Caregiver:
 * carerity-<project>-caregiver-auth
 *
 * Admin:
 * carerity-<project>-admin-auth
 * ============================================================
 */

export function getWorkspaceAuthStorageKey(
  workspace:
    CarerityAuthWorkspace
) {
  return `carerity-${supabaseProjectRef}-${workspace}-auth`;
}

/*
 * ============================================================
 * STORAGE ADAPTER
 * ============================================================
 *
 * Supabase passes its configured storageKey into these methods.
 *
 * We use that key directly instead of adding another prefix.
 * This makes the actual browser storage easy to inspect.
 * ============================================================
 */

const browserAuthStorage = {
  getItem(
    key:
      string
  ) {
    if (
      typeof window ===
      "undefined"
    ) {
      return null;
    }

    return window.localStorage.getItem(
      key
    );
  },

  setItem(
    key:
      string,

    value:
      string
  ) {
    if (
      typeof window ===
      "undefined"
    ) {
      return;
    }

    window.localStorage.setItem(
      key,
      value
    );
  },

  removeItem(
    key:
      string
  ) {
    if (
      typeof window ===
      "undefined"
    ) {
      return;
    }

    window.localStorage.removeItem(
      key
    );
  },
};

/*
 * ============================================================
 * CLIENT SINGLETONS
 * ============================================================
 *
 * Each workspace gets:
 *
 * 1. its own Supabase client
 * 2. its own auth storage key
 * 3. its own auth listeners
 *
 * No workspace shares another workspace's auth token.
 * ============================================================
 */

const globalForSupabase =
  globalThis as typeof globalThis & {
    carerityCustomerSupabase?:
      SupabaseClient;

    carerityCaregiverSupabase?:
      SupabaseClient;

    carerityAdminSupabase?:
      SupabaseClient;
  };

function createCarerityClient(
  workspace:
    CarerityAuthWorkspace
) {
  return createClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      auth: {
        persistSession:
          true,

        autoRefreshToken:
          true,

        /*
         * Leave enabled for the current MVP because
         * confirmation/reset flows currently use URL auth.
         *
         * Later we can make callback handling explicitly
         * workspace-aware.
         */
        detectSessionInUrl:
          true,

        flowType:
          "implicit",

        storage:
          browserAuthStorage,

        storageKey:
          getWorkspaceAuthStorageKey(
            workspace
          ),
      },
    }
  );
}

/*
 * ============================================================
 * CUSTOMER CLIENT
 * ============================================================
 */

export const customerSupabase =
  globalForSupabase
    .carerityCustomerSupabase ??
  createCarerityClient(
    "customer"
  );

/*
 * ============================================================
 * CAREGIVER CLIENT
 * ============================================================
 */

export const caregiverSupabase =
  globalForSupabase
    .carerityCaregiverSupabase ??
  createCarerityClient(
    "caregiver"
  );

/*
 * ============================================================
 * ADMIN CLIENT
 * ============================================================
 */

export const adminSupabase =
  globalForSupabase
    .carerityAdminSupabase ??
  createCarerityClient(
    "admin"
  );

if (
  process.env.NODE_ENV !==
  "production"
) {
  globalForSupabase
    .carerityCustomerSupabase =
    customerSupabase;

  globalForSupabase
    .carerityCaregiverSupabase =
    caregiverSupabase;

  globalForSupabase
    .carerityAdminSupabase =
    adminSupabase;
}

/*
 * ============================================================
 * CUSTOMER BACKWARDS COMPATIBILITY
 * ============================================================
 *
 * IMPORTANT:
 *
 * Plain "supabase" means CUSTOMER.
 *
 * It must NOT be imported by caregiver or admin pages.
 * ============================================================
 */

export const supabase =
  customerSupabase;

/*
 * ============================================================
 * TYPES
 * ============================================================
 */

export type CarerityRole =
  | "customer"
  | "caregiver"
  | "admin";

export type CarerityResolvedRole =
  CarerityRole | "";

export type CarerityAdminRole =
  | "admin"
  | "super_admin"
  | "reviewer";

export type CarerityAdminAccessResult =
  | {
      authorized:
        true;

      userId:
        string;

      adminRole:
        CarerityAdminRole;
    }
  | {
      authorized:
        false;

      userId?:
        string;

      error?:
        string;
    };

/*
 * ============================================================
 * AUTH CALLBACK
 * ============================================================
 */

export function getAuthCallbackUrl(
  nextPath:
    string
) {
  if (
    typeof window ===
    "undefined"
  ) {
    return "";
  }

  const safeNextPath =
    sanitizeInternalPath(
      nextPath,
      "/"
    );

  const callbackUrl =
    new URL(
      "/auth/callback",
      window.location.origin
    );

  callbackUrl.searchParams.set(
    "next",
    safeNextPath
  );

  return callbackUrl.toString();
}

/*
 * ============================================================
 * PASSWORD RESET
 * ============================================================
 */

export function getPasswordResetUrl(
  role:
    CarerityRole
) {
  if (
    typeof window ===
    "undefined"
  ) {
    return "";
  }

  const resetUrl =
    new URL(
      "/reset-password",
      window.location.origin
    );

  resetUrl.searchParams.set(
    "role",
    role
  );

  return resetUrl.toString();
}

/*
 * ============================================================
 * SAFE INTERNAL PATH
 * ============================================================
 */

export function sanitizeInternalPath(
  value:
    | string
    | null
    | undefined,

  fallback:
    string
) {
  if (
    !value
  ) {
    return fallback;
  }

  const trimmedValue =
    value.trim();

  if (
    !trimmedValue.startsWith(
      "/"
    ) ||
    trimmedValue.startsWith(
      "//"
    ) ||
    trimmedValue.includes(
      "\\"
    )
  ) {
    return fallback;
  }

  return trimmedValue;
}

/*
 * ============================================================
 * SYNCHRONOUS METADATA ROLE
 * ============================================================
 */

export function getUserRole(
  user:
    | {
        user_metadata?:
          Record<
            string,
            unknown
          >;
      }
    | null
    | undefined
): CarerityResolvedRole {
  const role =
    user
      ?.user_metadata
      ?.role;

  if (
    role ===
      "customer" ||
    role ===
      "caregiver" ||
    role ===
      "admin"
  ) {
    return role;
  }

  return "";
}

/*
 * ============================================================
 * AUTHORITATIVE ROLE RESOLUTION
 * ============================================================
 *
 * CRITICAL:
 *
 * Always pass the client belonging to the workspace being
 * authenticated.
 *
 * Customer:
 * resolveCarerityUserRole(user, customerSupabase)
 *
 * Caregiver:
 * resolveCarerityUserRole(user, caregiverSupabase)
 *
 * Admin:
 * resolveCarerityUserRole(user, adminSupabase)
 * ============================================================
 */

export async function resolveCarerityUserRole(
  suppliedUser?:
    User | null,

  client:
    SupabaseClient =
      customerSupabase
): Promise<CarerityResolvedRole> {
  try {
    let user =
      suppliedUser ||
      null;

    if (
      !user
    ) {
      const {
        data: {
          user:
            authenticatedUser,
        },

        error:
          userError,
      } =
        await client.auth.getUser();

      if (
        userError ||
        !authenticatedUser
      ) {
        return "";
      }

      user =
        authenticatedUser;
    }

    /*
     * --------------------------------------------------------
     * CAREGIVER
     * --------------------------------------------------------
     *
     * caregivers is authoritative for caregiver identity.
     */

    const {
      data:
        caregiverRecord,

      error:
        caregiverError,
    } =
      await client
        .from(
          "caregivers"
        )
        .select(
          "id"
        )
        .eq(
          "user_id",
          user.id
        )
        .maybeSingle();

    if (
      !caregiverError &&
      caregiverRecord
    ) {
      return "caregiver";
    }

    if (
      caregiverError
    ) {
      console.error(
        "Unable to resolve caregiver role:",
        caregiverError
      );
    }

    /*
     * --------------------------------------------------------
     * ADMIN
     * --------------------------------------------------------
     *
     * admin_users is authoritative.
     */

    const adminAccess =
      await checkCarerityAdminAccess(
        user.id,
        client
      );

    if (
      adminAccess.authorized
    ) {
      return "admin";
    }

    /*
     * --------------------------------------------------------
     * CUSTOMER
     * --------------------------------------------------------
     */

    const metadataRole =
      getUserRole(
        user
      );

    if (
      metadataRole ===
      "customer"
    ) {
      return "customer";
    }

    /*
     * Caregiver metadata may be useful for older caregiver
     * accounts if the profile lookup is temporarily blocked
     * by RLS.
     */

    if (
      metadataRole ===
      "caregiver"
    ) {
      return "caregiver";
    }

    /*
     * --------------------------------------------------------
     * LEGACY CUSTOMER FALLBACK
     * --------------------------------------------------------
     *
     * Some older family accounts were created before role
     * metadata was consistently written.
     *
     * We only apply this fallback while resolving the
     * CUSTOMER workspace client.
     *
     * This means:
     *
     * - customerSupabase + no caregiver/admin record -> customer
     * - caregiverSupabase + unknown identity -> unknown
     * - adminSupabase + unknown identity -> unknown
     *
     * This fixes older family accounts without weakening the
     * caregiver/admin workspace boundaries.
     */

    if (
      metadataRole ===
        "" &&
      client ===
        customerSupabase
    ) {
      return "customer";
    }

    /*
     * Admin metadata alone NEVER grants admin access.
     */

    return "";
  } catch (
    error
  ) {
    console.error(
      "Unable to resolve Carerity user role:",
      error
    );

    return "";
  }
}

/*
 * ============================================================
 * ROLE HOME
 * ============================================================
 */

export function getRoleHome(
  role:
    unknown
) {
  if (
    role ===
    "admin"
  ) {
    return "/admin";
  }

  if (
    role ===
    "caregiver"
  ) {
    return "/caregiver/dashboard";
  }

  if (
    role ===
    "customer"
  ) {
    return "/dashboard";
  }

  return "";
}

/*
 * ============================================================
 * ROLE LOGIN
 * ============================================================
 */

export function getRoleLogin(
  role:
    CarerityRole
) {
  if (
    role ===
    "admin"
  ) {
    return "/admin/login";
  }

  if (
    role ===
    "caregiver"
  ) {
    return "/caregiver/login";
  }

  return "/login";
}

/*
 * ============================================================
 * ADMIN ACCESS
 * ============================================================
 */

export async function checkCarerityAdminAccess(
  suppliedUserId?:
    string,

  client:
    SupabaseClient =
      adminSupabase
): Promise<CarerityAdminAccessResult> {
  try {
    let userId =
      suppliedUserId;

    if (
      !userId
    ) {
      const {
        data: {
          user,
        },

        error:
          userError,
      } =
        await client.auth.getUser();

      if (
        userError ||
        !user
      ) {
        return {
          authorized:
            false,

          error:
            getAuthErrorMessage(
              userError,
              "You must sign in as a Carerity administrator."
            ),
        };
      }

      userId =
        user.id;
    }

    const {
      data:
        adminRecord,

      error:
        adminError,
    } =
      await client
        .from(
          "admin_users"
        )
        .select(
          `
          user_id,
          admin_role,
          is_active
          `
        )
        .eq(
          "user_id",
          userId
        )
        .eq(
          "is_active",
          true
        )
        .maybeSingle();

    if (
      adminError
    ) {
      return {
        authorized:
          false,

        userId,

        error:
          getAuthErrorMessage(
            adminError,
            "Unable to verify administrator access."
          ),
      };
    }

    if (
      !adminRecord
    ) {
      return {
        authorized:
          false,

        userId,

        error:
          "This account is not authorized for the Carerity admin workspace.",
      };
    }

    const adminRole =
      normalizeAdminRole(
        adminRecord
          .admin_role
      );

    if (
      !adminRole
    ) {
      return {
        authorized:
          false,

        userId,

        error:
          "This administrator account has an invalid role.",
      };
    }

    return {
      authorized:
        true,

      userId,

      adminRole,
    };
  } catch (
    error
  ) {
    return {
      authorized:
        false,

      error:
        getAuthErrorMessage(
          error,
          "Unable to verify administrator access."
        ),
    };
  }
}

/*
 * ============================================================
 * ACTIVE ADMIN SESSION
 * ============================================================
 */

export async function hasActiveAdminSession() {
  const {
    data: {
      session,
    },

    error:
      sessionError,
  } =
    await adminSupabase
      .auth
      .getSession();

  if (
    sessionError ||
    !session?.user
  ) {
    return false;
  }

  const result =
    await checkCarerityAdminAccess(
      session.user.id,
      adminSupabase
    );

  return (
    result.authorized
  );
}

/*
 * ============================================================
 * ADMIN ROLE NORMALIZATION
 * ============================================================
 */

function normalizeAdminRole(
  value:
    unknown
): CarerityAdminRole | "" {
  switch (
    value
  ) {
    case "admin":
    case "super_admin":
    case "reviewer":
      return value;

    default:
      return "";
  }
}

/*
 * ============================================================
 * AUTH ERROR MESSAGE
 * ============================================================
 */

export function getAuthErrorMessage(
  error:
    unknown,

  fallback =
    "Something went wrong. Please try again."
) {
  if (
    !error
  ) {
    return fallback;
  }

  if (
    error instanceof
    Error
  ) {
    return (
      error.message ||
      fallback
    );
  }

  if (
    typeof error ===
      "object" &&
    error !==
      null
  ) {
    const possibleError =
      error as {
        message?:
          unknown;

        error_description?:
          unknown;

        code?:
          unknown;
      };

    if (
      typeof possibleError
        .message ===
        "string" &&
      possibleError
        .message
        .trim()
    ) {
      return possibleError
        .message;
    }

    if (
      typeof possibleError
        .error_description ===
        "string" &&
      possibleError
        .error_description
        .trim()
    ) {
      return possibleError
        .error_description;
    }

    if (
      typeof possibleError
        .code ===
        "string" &&
      possibleError
        .code
        .trim()
    ) {
      return possibleError
        .code;
    }
  }

  if (
    typeof error ===
      "string"
  ) {
    return error;
  }

  return fallback;
}
