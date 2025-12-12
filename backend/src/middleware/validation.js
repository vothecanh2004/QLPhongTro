import { z } from 'zod';

export const validate = (schema) => {
  return (req, res, next) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        // Get the first error message for user-friendly display
        const firstError = error.errors[0];
        const fieldName = firstError.path.join('.');
        let message = firstError.message;
        
        // Translate common validation errors to Vietnamese
        if (message.includes('String must contain at least')) {
          if (fieldName === 'name') {
            message = 'Tên phải có ít nhất 2 ký tự';
          } else if (fieldName === 'password') {
            message = 'Mật khẩu phải có ít nhất 6 ký tự';
          } else if (fieldName === 'phone') {
            message = 'Số điện thoại phải có ít nhất 10 số';
          }
        } else if (message.includes('Invalid email')) {
          message = 'Email không hợp lệ';
        } else if (message.includes('Invalid enum value')) {
          message = 'Giá trị không hợp lệ';
        }
        
        return res.status(400).json({
          message: message,
          errors: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message
          }))
        });
      }
      next(error);
    }
  };
};