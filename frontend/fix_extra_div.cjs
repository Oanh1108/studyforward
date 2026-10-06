const fs = require("fs");
let code = fs.readFileSync("components/learning/my-vocabulary/StudySessionView.tsx", "utf8");

code = code.replace(
  `            )}
          </div>
        </div>
      {/* Confirmation Modal when user exits mid-session */}`,
  `            )}
        </div>
      {/* Confirmation Modal when user exits mid-session */}`
);

fs.writeFileSync("components/learning/my-vocabulary/StudySessionView.tsx", code);
console.log("Removed extra </div>");

