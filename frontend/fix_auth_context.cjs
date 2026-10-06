
const fs = require("fs");
const path = "c:/studyforward/frontend/lib/authContext.tsx";
let code = fs.readFileSync(path, "utf8");

const URL_PARSE_LOGIC = `
    // Parse URL for token from Google Auth
    useEffect(() => {
      if (typeof window !== "undefined") {
        const urlParams = new URLSearchParams(window.location.search);
        const urlToken = urlParams.get("token");
        if (urlToken) {
          localStorage.setItem("accessToken", urlToken);
          // Remove token from URL for security
          window.history.replaceState({}, document.title, window.location.pathname);
          setToken(urlToken);
          setIsLoading(true);
          refreshSession();
        }
      }
    }, []);
`;

// Insert the URL parsing logic right after `useEffect(() => { if (typeof window !== "undefined") { ... } }, [user?.currentLanguage]);`
// Let's find a good place to insert it.
// Inside `AuthProvider` body.

code = code.replace(
  `    const [isLoading, setIsLoading] = useState<boolean>(true);\n\n    // Initialize state from storage after mounting to prevent hydration errors`,
  `    const [isLoading, setIsLoading] = useState<boolean>(true);\n${URL_PARSE_LOGIC}\n    // Initialize state from storage after mounting to prevent hydration errors`
);

fs.writeFileSync(path, code, "utf8");
console.log("Updated authContext.tsx");

