import nodemailer from 'nodemailer';

// Tạo transporter cho email
const createTransporter = () => {
  // Nếu có cấu hình SMTP trong .env, sử dụng nó
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT || 587,
      secure: process.env.SMTP_PORT == 465, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }
  
  // Nếu không có cấu hình, sử dụng test account (chỉ để test, không gửi email thật)
  // Trong production, bạn cần cấu hình SMTP thật
  return nodemailer.createTransporter({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: {
      user: 'test@ethereal.email',
      pass: 'test'
    }
  });
};

/**
 * Gửi email thông báo khi có lịch xem mới
 */
export const sendBookingNotificationEmail = async (landlordEmail, landlordName, bookingData) => {
  try {
    const transporter = createTransporter();
    
    // Format ngày giờ
    const viewDate = new Date(bookingData.viewDate).toLocaleDateString('vi-VN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            background-color: #4F46E5;
            color: white;
            padding: 20px;
            text-align: center;
            border-radius: 8px 8px 0 0;
          }
          .content {
            background-color: #f9fafb;
            padding: 30px;
            border-radius: 0 0 8px 8px;
          }
          .info-box {
            background-color: white;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
            border-left: 4px solid #4F46E5;
          }
          .info-item {
            margin: 10px 0;
          }
          .info-label {
            font-weight: bold;
            color: #4F46E5;
          }
          .button {
            display: inline-block;
            padding: 12px 24px;
            background-color: #4F46E5;
            color: white;
            text-decoration: none;
            border-radius: 6px;
            margin-top: 20px;
          }
          .footer {
            text-align: center;
            margin-top: 30px;
            color: #6b7280;
            font-size: 14px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🔔 Thông báo lịch xem phòng mới</h1>
        </div>
        <div class="content">
          <p>Xin chào <strong>${landlordName}</strong>,</p>
          
          <p>Bạn có một lịch xem phòng mới cho phòng trọ của bạn:</p>
          
          <div class="info-box">
            <div class="info-item">
              <span class="info-label">Phòng trọ:</span> ${bookingData.listing.title}
            </div>
            <div class="info-item">
              <span class="info-label">Địa chỉ:</span> ${bookingData.listing.address}
            </div>
            <div class="info-item">
              <span class="info-label">Người đặt lịch:</span> ${bookingData.user.name}
            </div>
            <div class="info-item">
              <span class="info-label">Số điện thoại:</span> ${bookingData.phone || bookingData.user.phone || 'Chưa cung cấp'}
            </div>
            <div class="info-item">
              <span class="info-label">Ngày xem:</span> ${viewDate}
            </div>
            <div class="info-item">
              <span class="info-label">Giờ xem:</span> ${bookingData.viewTime}
            </div>
            ${bookingData.message ? `
            <div class="info-item">
              <span class="info-label">Lời nhắn:</span> ${bookingData.message}
            </div>
            ` : ''}
          </div>
          
          <p>Vui lòng kiểm tra và xác nhận lịch xem này trong tài khoản của bạn.</p>
          
          <div class="footer">
            <p>Trân trọng,<br>Hệ thống QLPhongTro</p>
            <p style="font-size: 12px; color: #9ca3af;">
              Đây là email tự động, vui lòng không trả lời email này.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    const textContent = `
Thông báo lịch xem phòng mới

Xin chào ${landlordName},

Bạn có một lịch xem phòng mới cho phòng trọ của bạn:

Phòng trọ: ${bookingData.listing.title}
Địa chỉ: ${bookingData.listing.address}
Người đặt lịch: ${bookingData.user.name}
Số điện thoại: ${bookingData.phone || bookingData.user.phone || 'Chưa cung cấp'}
Ngày xem: ${viewDate}
Giờ xem: ${bookingData.viewTime}
${bookingData.message ? `Lời nhắn: ${bookingData.message}` : ''}

Vui lòng kiểm tra và xác nhận lịch xem này trong tài khoản của bạn.

Trân trọng,
Hệ thống QLPhongTro
    `;

    const mailOptions = {
      from: process.env.SMTP_FROM || `"QLPhongTro" <${process.env.SMTP_USER || 'noreply@qlphongtro.com'}>`,
      to: landlordEmail,
      subject: `🔔 Thông báo: Có lịch xem phòng mới - ${bookingData.listing.title}`,
      text: textContent,
      html: htmlContent
    };

    // Chỉ gửi email nếu có cấu hình SMTP
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
      const info = await transporter.sendMail(mailOptions);
      console.log('Email sent:', info.messageId);
      return { success: true, messageId: info.messageId };
    } else {
      // Nếu không có cấu hình SMTP, chỉ log ra console
      console.log('Email notification (SMTP not configured):');
      console.log('To:', landlordEmail);
      console.log('Subject:', mailOptions.subject);
      console.log('Content:', textContent);
      return { success: true, messageId: 'not-sent-no-smtp' };
    }
  } catch (error) {
    console.error('Error sending email:', error);
    // Không throw error để không làm gián đoạn quá trình tạo booking
    return { success: false, error: error.message };
  }
};


