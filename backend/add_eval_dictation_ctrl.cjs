const fs = require("fs");
let code = fs.readFileSync("src/vocabulary/vocabulary.controller.ts", "utf8");

const evaluateDictationCode = `
  // POST /api/vocabulary/study/evaluate-dictation (auth required)
  @UseGuards(JwtAuthGuard)
  @Post('study/evaluate-dictation')
  evaluateDictation(
    @Request() req: any,
    @Body()
    body: {
      wordId: number;
      typingInput: string;
      synonymChips: string[];
      synonymTestMode: string;
      recordSrs?: boolean;
    },
  ) {
    const userId = req.user?.id ?? req.user?.sub;
    return this.service.evaluateDictation(userId, body);
  }
`;

code = code.replace(/@UseGuards\(JwtAuthGuard\)\s*@Post\('study\/session-complete'\)/, evaluateDictationCode.trim() + "\n\n  @UseGuards(JwtAuthGuard)\n  @Post('study/session-complete')");

fs.writeFileSync("src/vocabulary/vocabulary.controller.ts", code);
console.log("Controller updated");

