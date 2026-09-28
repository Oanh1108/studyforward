import { IsEmail, IsString, MinLength, IsInt, Min, Max, IsOptional } from 'class-validator';

export class RegisterDto {
  @IsString()
  name: string;

  @IsEmail({}, { message: 'Email không hợp lệ' })
  email: string;

  @IsString()
  @MinLength(8, { message: 'Mật khẩu tối thiểu 8 ký tự' })
  password: string;

  @IsOptional()
  @IsInt()
  @Min(10)
  @Max(990)
  goal?: number;
}
