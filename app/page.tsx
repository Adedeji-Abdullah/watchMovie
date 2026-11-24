"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAccessToken, setAccessToken } from "@/lib/auth";

type AuthUser = {
  id: string;
  name: string;
  email: string;
};

let refreshRequest: Promise<string | null> | null = null;

async function refreshAccessToken(apiBaseUrl: URL) {
  if (refreshRequest) return refreshRequest;

  refreshRequest = (async () => {
    try {
      const response = await fetch(new URL("/refresh", apiBaseUrl), {
        method: "POST",
        credentials: "include",
      });
      const result: { accessToken?: string } = await response.json();

      if (!response.ok || !result.accessToken) return null;
      return result.accessToken;
    } catch {
      return null;
    } finally {
      refreshRequest = null;
    }
  })();

  return refreshRequest;
}



export default function ProtectedPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | { name: string; email: string }>({
    name: "guest",
    email: "guest@gmail.com",
  });
  const [searchResults, setSearchResults] = useState<
    {
      identifier: string;
      title?: string;
      creator?: string | string[];
      date?: string;
    }[]
  >([]);

  useEffect(() => {
    let cancelled = false;

    async function loadAuthenticatedUser() {
      const apiBaseUrl = new URL(
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",
      );
      let accessToken = getAccessToken();

      if (!accessToken) {
        accessToken = await refreshAccessToken(apiBaseUrl);
        if (accessToken) setAccessToken(accessToken);
      }

      if (!accessToken) {
        if (!cancelled) router.replace("/access");
        router.push("/access");
        return;
      }

      try {
        const response = await fetch(new URL("/me", apiBaseUrl), {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (!response.ok) {
          setAccessToken(null);
          if (!cancelled) router.replace("/access");
          return;
        }

        const result: { user: AuthUser } = await response.json();
        if (!cancelled) setUser(result.user);
      } catch {
        setAccessToken(null);
        if (!cancelled) router.replace("/access");
      }
    }

    loadAuthenticatedUser();

    return () => {
      cancelled = true;
    };
  }, [router]);

  const searchMovies = async (query: string) => {
    const url = new URL("https://archive.org/advancedsearch.php");
    url.searchParams.set(
      "q",
      `mediatype:movies AND collection:feature_films AND title:(${query})`,
    );
    ["identifier", "title", "creator", "date"].forEach((field) => {
      url.searchParams.append("fl[]", field);
    });
    url.searchParams.set("rows", "24");
    url.searchParams.append("sort[]", "downloads desc");
    url.searchParams.set("output", "json");

    const response = await fetch(url.toString());

    if (!response.ok) {
      throw new Error("Failed to fetch movies");
    }

    const data = await response.json();
    return data.response?.docs ?? [];
  };

  const logout = async () => {
    const apiBaseUrl = new URL(
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",
    );
    let accessToken = getAccessToken();
    console.log(accessToken)
    try {
      const response = await fetch(`http://localhost:8000/logout`, {
        method: 'POST',
        credentials: "include"
      });
      console.log("out");

      if (response.ok) {
        router.push("/access");
      }
    } catch (error) {
      console.log(error);
    }
    return;
  };

  return (
    <main className="relative min-h-screen bg-[#020617] px-6 py-10 text-white">
      <div className="movie-flow-bg fixed inset-0" aria-hidden="true" />
      <div
        className="fixed inset-0 bg-gradient-to-b from-black/40 via-black/30 to-[#020617]/80"
        aria-hidden="true"
      />
      <div className="relative z-10 mx-auto max-w-4xl">
        <header className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/5 p-6 shadow-lg backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-emerald-300/80">
              Movie Library
            </p>
            <h1 className="mt-1 text-3xl font-semibold">
              Welcome, {user.name}
            </h1>
            <p className="mt-2 text-sm text-white/70">{user.email}</p>
          </div>
          <button
            onClick={logout}
            className="inline-flex items-center justify-center rounded-lg border border-white/15 bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-emerald-400/60"
          >
            Logout
          </button>
        </header>

        <section className="mt-8 rounded-2xl border border-white/10 bg-black/20 p-5 shadow-md">
          <label
            htmlFor="movie-search"
            className="mb-2 block text-sm font-medium text-white/80"
          >
            Search films
          </label>
          <input
            id="movie-search"
            type="text"
            placeholder="Search for movies..."
            onChange={(e) => {
              const query = e.target.value.trim();
              if (query.length > 2) {
                searchMovies(query)
                  .then((results) => {
                    setSearchResults(results);
                  })
                  .catch(() => {
                    setSearchResults([]);
                  });
              } else {
                setSearchResults([]);
              }
            }}
            className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-white placeholder:text-white/40 outline-none transition focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-400/30"
          />

          <div className="mt-6">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">
                Available films
              </h2>
              <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-white/70">
                {searchResults.length} results
              </span>
            </div>

            {searchResults.length === 0 ? (
              <div className="rounded-xl border border-dashed border-white/15 bg-white/[0.03] px-4 py-8 text-center text-sm text-white/50">
                Start typing at least 3 characters to see available films.
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {searchResults.map((movie) => (
                  <article
                    key={movie.identifier}
                    className="group overflow-hidden rounded-xl border border-white/10 bg-white/5 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-400/30 hover:bg-white/[0.08]"
                  >
                    <div className="aspect-video w-full overflow-hidden bg-black/50 p-2">
                      <img
                        src={`https://archive.org/services/img/${movie.identifier}`}
                        alt={movie.title || "Film poster"}
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full rounded-md object-contain transition duration-300 group-hover:scale-[1.02]"
                      />
                    </div>
                    <div className="p-4">
                      <h3 className="line-clamp-2 text-base font-semibold leading-snug text-white">
                        {movie.title || "Untitled"}
                      </h3>
                      <p className="mt-2 text-sm text-white/70">
                        <span className="font-medium text-white/80">Creator:</span>{" "}
                        {Array.isArray(movie.creator)
                          ? movie.creator.join(", ")
                          : movie.creator || "Unknown"}
                      </p>
                      <p className="mt-1 text-sm text-white/70">
                        <span className="font-medium text-white/80">Date:</span>{" "}
                        {movie.date || "N/A"}
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
