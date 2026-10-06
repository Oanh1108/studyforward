const fs = require("fs");

let serviceCode = fs.readFileSync("c:/studyforward/backend/src/vocabulary/vocabulary.service.ts", "utf8");
const getMethod = `  async getStudySession(userId: number, sessionId: string) {
    return this.studySessionRepo.findOne({
      where: { userId, id: sessionId },
    });
  }`;
serviceCode = serviceCode.replace(
  "async getIncompleteStudySessions(userId: number, language?: string) {",
  getMethod + "\n\n  async getIncompleteStudySessions(userId: number, language?: string) {"
);
fs.writeFileSync("c:/studyforward/backend/src/vocabulary/vocabulary.service.ts", serviceCode, "utf8");

let controllerCode = fs.readFileSync("c:/studyforward/backend/src/vocabulary/vocabulary.controller.ts", "utf8");
const getEndpoint = `  @UseGuards(JwtAuthGuard)
  @Get('study/sessions/:id')
  getStudySession(@Request() req: any, @Param('id') id: string) {
    const userId = req.user?.id ?? req.user?.sub;
    return this.service.getStudySession(userId, id);
  }`;
controllerCode = controllerCode.replace(
  "@Get('study/incomplete-sessions')",
  getEndpoint + "\n\n  @Get('study/incomplete-sessions')"
);
fs.writeFileSync("c:/studyforward/backend/src/vocabulary/vocabulary.controller.ts", controllerCode, "utf8");

let apiCode = fs.readFileSync("c:/studyforward/frontend/lib/myVocabApi.ts", "utf8");
const apiMethod = `  async getStudySession(id: string): Promise<any> {
    return requestApi<any>(\`/api/vocabulary/study/sessions/\${id}\`);
  },`;
apiCode = apiCode.replace(
  "async getIncompleteStudySessions(language?: string): Promise<any[]> {",
  apiMethod + "\n\n  async getIncompleteStudySessions(language?: string): Promise<any[]> {"
);
fs.writeFileSync("c:/studyforward/frontend/lib/myVocabApi.ts", apiCode.replace(/''/g, "'"), "utf8");

console.log("Added getStudySession endpoint and API method!");

