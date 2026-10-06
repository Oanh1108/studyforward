import { IsEmail, IsString, MinLength, IsInt, Min, Max, IsOptional } from 'class-validator';

export class RegisterDto {
  @IsString({ message: 'Họ và tên không được để trống' })
  @MinLength(2, { message: 'Họ và tên tối thiểu 2 ký tự' })
  name: string;

  @IsEmail({}, { message: 'Email không đúng định dạng' })
  email: string;

  @IsString({ message: 'Mật khẩu không được để trống' })
  @MinLength(8, { message: 'Mật khẩu tối thiểu 8 ký tự' })
  password: string;

  @IsOptional()
  @IsInt()
  @Min(10)
  @Max(990)
  goal?: number;
}
