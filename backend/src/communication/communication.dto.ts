import { IsBase64, IsIn, IsOptional, IsString, Length, MaxLength } from 'class-validator';
import { CORRECTION_MODES, LEVELS, MAX_MESSAGE_LENGTH, MODES } from './communication.constants.js';

export class CreateSessionDto {
  @IsIn(MODES as unknown as string[])
  mode: string;

  /** Topic id for free/daily, scenario id for roleplay. Checked against the catalogue in the service. */
  @IsString()
  @Length(1, 60)
  topic: string;

  @IsIn(LEVELS as unknown as string[])
  level: string;

  @IsOptional()
  @IsIn(CORRECTION_MODES as unknown as string[])
  correctionMode?: string;
}

export class SendMessageDto {
  @IsString()
  @Length(1, MAX_MESSAGE_LENGTH)
  content: string;

  @IsOptional()
  @IsIn(['text', 'voice'])
  inputType?: string;
}

export class TranscribeDto {
  /** Base64 of the recorded audio (no data: prefix). */
  @IsBase64()
  audio: string;

  @IsString()
  @MaxLength(80)
  mimeType: string;
}
