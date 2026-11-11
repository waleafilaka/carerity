export type CarerityLoginRole =
  | "caregiver"
  | "customer";

const KEEP_SIGNED_IN_KEY =
  "carerity.keepSignedIn";

const CAREGIVER_EMAIL_KEY =
  "carerity.caregiver.rememberedEmail";

const CUSTOMER_EMAIL_KEY =
  "carerity.customer.rememberedEmail";

/*
 * ============================================================
 * BROWSER STORAGE
 * ============================================================
 */

function canUseBrowserStorage() {
  return (
    typeof window !==
    "undefined"
  );
}

/*
 * ============================================================
 * KEEP SIGNED IN
 * ============================================================
 *
 * true:
 * Supabase auth session lives in localStorage.
 *
 * false:
 * Supabase auth session lives in sessionStorage.
 *
 * sessionStorage survives:
 * - page navigation
 * - router navigation
 * - refreshes
 *
 * but normally disappears when the browser/tab session ends.
 * ============================================================
 */

export function getKeepSignedInPreference() {
  if (
    !canUseBrowserStorage()
  ) {
    return true;
  }

  try {
    const stored =
      window.localStorage.getItem(
        KEEP_SIGNED_IN_KEY
      );

    /*
     * Checked by default.
     */
    if (
      stored ===
      null
    ) {
      return true;
    }

    return (
      stored !==
      "false"
    );
  } catch {
    return true;
  }
}

export function setKeepSignedInPreference(
  value:
    boolean
) {
  if (
    !canUseBrowserStorage()
  ) {
    return;
  }

  try {
    window.localStorage.setItem(
      KEEP_SIGNED_IN_KEY,
      value
        ? "true"
        : "false"
    );

    /*
     * If a Supabase session already exists,
     * move it into the storage mechanism
     * selected by the user.
     *
     * This is important when somebody changes
     * "Keep me signed in" between sign-ins.
     */
    migrateSupabaseAuthStorage(
      value
    );
  } catch (
    error
  ) {
    console.error(
      "Unable to save keep-signed-in preference:",
      error
    );
  }
}

/*
 * ============================================================
 * REMEMBERED LOGIN EMAIL
 * ============================================================
 */

function getEmailStorageKey(
  role:
    CarerityLoginRole
) {
  return role ===
    "caregiver"
    ? CAREGIVER_EMAIL_KEY
    : CUSTOMER_EMAIL_KEY;
}

export function getRememberedLoginEmail(
  role:
    CarerityLoginRole
) {
  if (
    !canUseBrowserStorage()
  ) {
    return "";
  }

  try {
    return (
      window.localStorage.getItem(
        getEmailStorageKey(
          role
        )
      ) ||
      ""
    );
  } catch {
    return "";
  }
}

export function rememberLoginEmail(
  role:
    CarerityLoginRole,
  email:
    string
) {
  if (
    !canUseBrowserStorage()
  ) {
    return;
  }

  const normalized =
    email
      .trim()
      .toLowerCase();

  if (
    !normalized
  ) {
    return;
  }

  try {
    window.localStorage.setItem(
      getEmailStorageKey(
        role
      ),
      normalized
    );
  } catch (
    error
  ) {
    console.error(
      "Unable to remember login email:",
      error
    );
  }
}

export function clearRememberedLoginEmail(
  role:
    CarerityLoginRole
) {
  if (
    !canUseBrowserStorage()
  ) {
    return;
  }

  try {
    window.localStorage.removeItem(
      getEmailStorageKey(
        role
      )
    );
  } catch (
    error
  ) {
    console.error(
      "Unable to clear remembered login email:",
      error
    );
  }
}

/*
 * ============================================================
 * SUPABASE AUTH STORAGE ADAPTER
 * ============================================================
 *
 * IMPORTANT:
 *
 * Supabase expects one consistent StorageLike object.
 *
 * We determine the target storage using the Carerity
 * keep-signed-in preference.
 *
 * The adapter also repairs old sessions if a previous
 * Carerity build stored the token in the opposite store.
 * ============================================================
 */

function getPreferredAuthStorage() {
  if (
    !canUseBrowserStorage()
  ) {
    return null;
  }

  return getKeepSignedInPreference()
    ? window.localStorage
    : window.sessionStorage;
}

function getAlternateAuthStorage() {
  if (
    !canUseBrowserStorage()
  ) {
    return null;
  }

  return getKeepSignedInPreference()
    ? window.sessionStorage
    : window.localStorage;
}

export const carerityAuthStorage = {
  getItem(
    key:
      string
  ) {
    if (
      !canUseBrowserStorage()
    ) {
      return null;
    }

    try {
      const preferredStorage =
        getPreferredAuthStorage();

      const alternateStorage =
        getAlternateAuthStorage();

      if (
        !preferredStorage
      ) {
        return null;
      }

      /*
       * Normal case.
       */
      const preferredValue =
        preferredStorage.getItem(
          key
        );

      if (
        preferredValue !==
        null
      ) {
        return preferredValue;
      }

      /*
       * Compatibility repair:
       *
       * If an older Carerity build left the
       * Supabase token in the opposite storage,
       * recover it instead of treating the user
       * as signed out.
       */
      const alternateValue =
        alternateStorage?.getItem(
          key
        );

      if (
        alternateValue ===
          null ||
        alternateValue ===
          undefined
      ) {
        return null;
      }

      /*
       * Move recovered session into the
       * currently selected storage.
       */
      preferredStorage.setItem(
        key,
        alternateValue
      );

      alternateStorage?.removeItem(
        key
      );

      return alternateValue;
    } catch (
      error
    ) {
      console.error(
        "Unable to read Carerity authentication storage:",
        error
      );

      return null;
    }
  },

  setItem(
    key:
      string,
    value:
      string
  ) {
    if (
      !canUseBrowserStorage()
    ) {
      return;
    }

    try {
      const preferredStorage =
        getPreferredAuthStorage();

      const alternateStorage =
        getAlternateAuthStorage();

      if (
        !preferredStorage
      ) {
        return;
      }

      preferredStorage.setItem(
        key,
        value
      );

      /*
       * There must only be one authoritative
       * Supabase token.
       */
      alternateStorage?.removeItem(
        key
      );
    } catch (
      error
    ) {
      console.error(
        "Unable to save Carerity authentication storage:",
        error
      );
    }
  },

  removeItem(
    key:
      string
  ) {
    if (
      !canUseBrowserStorage()
    ) {
      return;
    }

    try {
      /*
       * Sign-out must remove the token
       * regardless of where it was stored.
       */
      window.localStorage.removeItem(
        key
      );

      window.sessionStorage.removeItem(
        key
      );
    } catch (
      error
    ) {
      console.error(
        "Unable to remove Carerity authentication storage:",
        error
      );
    }
  },
};

/*
 * ============================================================
 * AUTH STORAGE MIGRATION
 * ============================================================
 */

function migrateSupabaseAuthStorage(
  keepSignedIn:
    boolean
) {
  if (
    !canUseBrowserStorage()
  ) {
    return;
  }

  try {
    const targetStorage =
      keepSignedIn
        ? window.localStorage
        : window.sessionStorage;

    const sourceStorage =
      keepSignedIn
        ? window.sessionStorage
        : window.localStorage;

    const keysToMove:
      string[] =
        [];

    for (
      let index =
        0;
      index <
      sourceStorage.length;
      index +=
      1
    ) {
      const key =
        sourceStorage.key(
          index
        );

      if (
        key &&
        isSupabaseAuthKey(
          key
        )
      ) {
        keysToMove.push(
          key
        );
      }
    }

    keysToMove.forEach(
      (
        key
      ) => {
        const value =
          sourceStorage.getItem(
            key
          );

        if (
          value !==
          null
        ) {
          targetStorage.setItem(
            key,
            value
          );
        }

        sourceStorage.removeItem(
          key
        );
      }
    );
  } catch (
    error
  ) {
    console.error(
      "Unable to migrate Carerity authentication storage:",
      error
    );
  }
}

function isSupabaseAuthKey(
  key:
    string
) {
  return (
    key.startsWith(
      "sb-"
    ) &&
    key.includes(
      "-auth-token"
    )
  );
}

/*
 * ============================================================
 * CLEAR SUPABASE SESSION
 * ============================================================
 */

export function clearSupabaseAuthStorage(
  projectRef:
    string
) {
  if (
    !canUseBrowserStorage()
  ) {
    return;
  }

  const prefix =
    `sb-${projectRef}-auth-token`;

  try {
    [
      window.localStorage,
      window.sessionStorage,
    ].forEach(
      (
        storage
      ) => {
        const keys:
          string[] =
            [];

        for (
          let index =
            0;
          index <
          storage.length;
          index +=
          1
        ) {
          const key =
            storage.key(
              index
            );

          if (
            key &&
            key.startsWith(
              prefix
            )
          ) {
            keys.push(
              key
            );
          }
        }

        keys.forEach(
          (
            key
          ) => {
            storage.removeItem(
              key
            );
          }
        );
      }
    );
  } catch (
    error
  ) {
    console.error(
      "Unable to clear Supabase authentication storage:",
      error
    );
  }
}
