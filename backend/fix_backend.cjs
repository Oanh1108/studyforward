const fs = require("fs");
let serviceCode = fs.readFileSync("c:/studyforward/backend/src/vocabulary/vocabulary.service.ts", "utf8");

// Add getIncompleteStudySessions
const incompleteMethod = `  async getIncompleteStudySessions(userId: number, language?: string) {
    const where: any = { userId, isCompleted: false };
    if (language) {
      where.language = language;
    }
    return this.studySessionRepo.find({
      where,
      order: { updatedAt: "DESC" },
      take: 10,
    });
  }`;

serviceCode = serviceCode.replace(
  "async getRecentStudySession(userId: number) {",
  incompleteMethod + "\n\n  async getRecentStudySession(userId: number) {"
);
fs.writeFileSync("c:/studyforward/backend/src/vocabulary/vocabulary.service.ts", serviceCode, "utf8");

let controllerCode = fs.readFileSync("c:/studyforward/backend/src/vocabulary/vocabulary.controller.ts", "utf8");
const getIncompleteEndpoint = `  @UseGuards(JwtAuthGuard)
  @Get('study/incomplete-sessions')
  getIncompleteStudySessions(@Request() req: any, @Query('language') language?: string) {
    const userId = req.user?.id ?? req.user?.sub;
    return this.service.getIncompleteStudySessions(userId, language);
  }`;
controllerCode = controllerCode.replace(
  "@Get('study/recent-session')",
  getIncompleteEndpoint + "\n\n  @Get('study/recent-session')"
);
fs.writeFileSync("c:/studyforward/backend/src/vocabulary/vocabulary.controller.ts", controllerCode, "utf8");
console.log("Backend incomplete sessions endpoints added!");

