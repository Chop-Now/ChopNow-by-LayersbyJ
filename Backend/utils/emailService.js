const sgMail = require('@sendgrid/mail');
const axios = require('axios');
const logger = require('./logger');

// Initialize SendGrid only if configured and Brevo is not active
if (process.env.SENDGRID_API_KEY && !process.env.BREVO_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@chopnow.app';
const FROM_NAME = process.env.FROM_NAME || 'ChopNow';
const APP_URL = process.env.FRONTEND_URL || 'https://www.chopnow.app';

/**
 * Send email using Brevo or SendGrid
 */
const sendEmail = async (to, subject, html) => {
  try {
    // ── Use Brevo API if Key is Configured ──
    if (process.env.BREVO_API_KEY) {
      const response = await axios.post(
        'https://api.brevo.com/v3/smtp/email',
        {
          sender: { name: FROM_NAME, email: FROM_EMAIL },
          to: [{ email: to }],
          subject,
          htmlContent: html,
        },
        {
          headers: {
            'api-key': process.env.BREVO_API_KEY,
            'content-type': 'application/json',
          },
        }
      );
      return response.status === 201 || response.status === 200;
    }

    // ── Fallback to SendGrid ──
    if (!process.env.SENDGRID_API_KEY) {
      logger.warn('No email service configured (Neither BREVO_API_KEY nor SENDGRID_API_KEY found)');
      return false;
    }

    const msg = {
      to,
      from: {
        email: FROM_EMAIL,
        name: FROM_NAME,
      },
      subject,
      html,
    };

    await sgMail.send(msg);
    return true;
  } catch (error) {
    logger.error({ err: error }, 'Error sending email');
    if (error.response && error.response.data) {
      logger.error({ body: error.response.data }, 'Email service response details');
    } else if (error.response) {
      logger.error({ body: error.response.body }, 'SendGrid error details');
    }
    return false;
  }
};

/**
 * Email template wrapper
 */
const emailTemplate = (title, content) => `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
  </head>
  <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #00A86B 0%, #007A4B 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
      <h1 style="color: white; margin: 0;">ChopNow</h1>
    </div>
    <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
      <h2 style="color: #1f2937; margin-top: 0;">${title}</h2>
      ${content}
    </div>
  </body>
  </html>
`;

/**
 * Send email verification
 */
const sendVerificationEmail = async (email, name, verificationToken) => {
  const verificationUrl = `${APP_URL}/verify-email?token=${verificationToken}`;

  const content = `
    <p>Hello ${name},</p>
    <p>Thank you for signing up. Please verify your email address to complete your registration.</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${verificationUrl}" style="background: #00A86B; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">Verify Email</a>
    </div>
    <p style="color: #6b7280; font-size: 14px;">Or copy and paste this link into your browser:</p>
    <p style="color: #6b7280; font-size: 12px; word-break: break-all;">${verificationUrl}</p>
    <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">This link will expire in 24 hours.</p>
    <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">If you didn't create an account, you can safely ignore this email.</p>
  `;

  return sendEmail(
    email,
    'Verify your ChopNow account',
    emailTemplate('Welcome to ChopNow!', content)
  );
};

/**
 * Send password reset email
 */
const sendPasswordResetEmail = async (email, name, resetToken) => {
  const resetUrl = `${APP_URL}/reset-password?token=${resetToken}`;

  const content = `
    <p>Hello ${name},</p>
    <p>We received a request to reset your password. Click the button below to create a new password.</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${resetUrl}" style="background: #00A86B; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">Reset Password</a>
    </div>
    <p style="color: #6b7280; font-size: 14px;">Or copy and paste this link into your browser:</p>
    <p style="color: #6b7280; font-size: 12px; word-break: break-all;">${resetUrl}</p>
    <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">This link will expire in 1 hour.</p>
    <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.</p>
  `;

  return sendEmail(
    email,
    'Reset your ChopNow password',
    emailTemplate('Password Reset Request', content)
  );
};

/**
 * Send OTP for password reset
 */
const sendPasswordResetOTPEmail = async (email, name, otpCode) => {
  const content = `
    <p>Hello ${name},</p>
    <p>We received a request to reset your password. Use the verification code below to complete the reset process:</p>
    <div style="text-align: center; margin: 30px 0;">
      <div style="background: white; border: 2px solid #00A86B; border-radius: 8px; padding: 20px; display: inline-block;">
        <div style="font-size: 32px; font-weight: bold; color: #00A86B; letter-spacing: 8px;">${otpCode}</div>
      </div>
    </div>
    <p style="color: #6b7280; font-size: 14px;">This verification code will expire in 15 minutes.</p>
    <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.</p>
  `;

  return sendEmail(
    email,
    'Reset your ChopNow password - Verification Code',
    emailTemplate('Password Reset Request', content)
  );
};

/**
 * Send OTP for email login
 */
const sendOTPEmail = async (email, name, otpCode) => {
  const content = `
    <p>Hello ${name},</p>
    <p>Use this code to sign in to your ChopNow account:</p>
    <div style="text-align: center; margin: 30px 0;">
      <div style="background: white; border: 2px solid #00A86B; border-radius: 8px; padding: 20px; display: inline-block;">
        <div style="font-size: 32px; font-weight: bold; color: #00A86B; letter-spacing: 8px;">${otpCode}</div>
      </div>
    </div>
    <p style="color: #6b7280; font-size: 14px;">This code will expire in 10 minutes.</p>
    <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">If you didn't request this code, please ignore this email or contact support.</p>
  `;

  return sendEmail(email, 'Your ChopNow login code', emailTemplate('Your Login Code', content));
};

/**
 * Send OTP for password change verification
 */
const sendPasswordChangeOTP = async (email, name, otpCode) => {
  const content = `
    <p>Hello ${name},</p>
    <p>You requested to change your password. Use this code to verify your identity:</p>
    <div style="text-align: center; margin: 30px 0;">
      <div style="background: white; border: 2px solid #00A86B; border-radius: 8px; padding: 20px; display: inline-block;">
        <div style="font-size: 32px; font-weight: bold; color: #00A86B; letter-spacing: 8px;">${otpCode}</div>
      </div>
    </div>
    <p style="color: #6b7280; font-size: 14px;">This code will expire in 10 minutes.</p>
    <p style="color: #6b7280; font-size: 14px; margin-top: 20px;"><strong>Important:</strong> If you didn't request to change your password, please secure your account immediately.</p>
  `;

  return sendEmail(
    email,
    'Password Change Verification - ChopNow',
    emailTemplate('Password Change Verification', content)
  );
};

/**
 * Send OTP for sensitive information change (vendor)
 */
const sendSensitiveChangeOTP = async (email, name, otpCode, changeType) => {
  const content = `
    <p>Hello ${name},</p>
    <p>You requested to update your ${changeType}. Use this code to verify your identity:</p>
    <div style="text-align: center; margin: 30px 0;">
      <div style="background: white; border: 2px solid #00A86B; border-radius: 8px; padding: 20px; display: inline-block;">
        <div style="font-size: 32px; font-weight: bold; color: #00A86B; letter-spacing: 8px;">${otpCode}</div>
      </div>
    </div>
    <p style="color: #6b7280; font-size: 14px;">This code will expire in 10 minutes.</p>
    <p style="color: #6b7280; font-size: 14px; margin-top: 20px;"><strong>Important:</strong> If you didn't make this request, please contact support immediately.</p>
  `;

  return sendEmail(
    email,
    `Verify ${changeType} Update - ChopNow`,
    emailTemplate('Security Verification', content)
  );
};

/**
 * Send order confirmation email
 */
const sendOrderConfirmationEmail = async (email, name, order) => {
  const hasVendor = order.business && typeof order.business === 'object';
  const vendorName = hasVendor ? order.business.name : 'Vendor';
  const vendorAddress = hasVendor ? order.business.address : null;
  const coords = hasVendor && order.business.location?.coordinates;
  const googleMapsLink =
    coords && coords.length === 2 && coords[0] !== 0 && coords[1] !== 0
      ? `https://www.google.com/maps/dir/?api=1&destination=${coords[1]},${coords[0]}`
      : null;
  const appleMapsLink =
    coords && coords.length === 2 && coords[0] !== 0 && coords[1] !== 0
      ? `http://maps.apple.com/?daddr=${coords[1]},${coords[0]}`
      : null;
  const wazeLink =
    coords && coords.length === 2 && coords[0] !== 0 && coords[1] !== 0
      ? `https://waze.com/ul?ll=${coords[1]},${coords[0]}&navigate=yes`
      : null;

  const content = `
    <p>Hello ${name},</p>
    <p>Your order has been confirmed. Here are the details:</p>
    <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0; border: 1px solid #e5e7eb;">
      <p style="margin: 5px 0;"><strong>Order Number:</strong> ${order.orderNumber}</p>
      <p style="margin: 5px 0;"><strong>Total:</strong> ${order.pricing?.currency || 'RWF'} ${(order.pricing?.total || 0).toLocaleString()}</p>
      <p style="margin: 5px 0;"><strong>Fulfillment Type:</strong> <span style="text-transform: capitalize;">${order.fulfillmentType}</span></p>
      <p style="margin: 5px 0;"><strong>Status:</strong> ${order.status}</p>
      ${
        order.fulfillmentType === 'pickup' && order.pickupDetails?.pickupCode
          ? `<p style="margin: 15px 0 5px 0;"><strong>Pickup Code:</strong> <span style="font-size: 18px; font-weight: bold; color: #00a86b;">${order.pickupDetails.pickupCode}</span></p>`
          : ''
      }
    </div>

    ${
      order.fulfillmentType === 'pickup'
        ? `
      <div style="background: #f0fdf4; border-left: 4px solid #00A86B; border-radius: 8px; padding: 20px; margin: 20px 0; font-family: sans-serif;">
        <h4 style="margin: 0 0 15px 0; color: #166534; font-size: 16px;">Store Pickup Details</h4>
        
        ${
          order.pickupDetails?.pickupCode
            ? `
          <div style="text-align: center; background: white; padding: 15px; border-radius: 8px; border: 1px solid #dcfce7; margin-bottom: 15px;">
            <p style="margin: 0 0 10px 0; font-size: 12px; color: #6b7280; font-weight: bold; letter-spacing: 0.5px;">YOUR SCAN PASS</p>
            <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${order.pickupDetails.pickupCode}" width="150" height="150" alt="Pickup QR Code" style="display: block; margin: 0 auto; max-width: 100%; height: auto;" />
            <p style="margin: 10px 0 0 0; font-size: 18px; font-weight: bold; color: #166534; letter-spacing: 2px;">${order.pickupDetails.pickupCode}</p>
          </div>
          `
            : ''
        }

        <p style="margin: 5px 0; font-size: 14px; color: #374151;"><strong>Vendor Name:</strong> ${vendorName}</p>
        ${
          vendorAddress
            ? `<p style="margin: 5px 0; font-size: 14px; color: #374151;"><strong>Address:</strong> ${typeof vendorAddress === 'string' ? vendorAddress : JSON.stringify(vendorAddress)}</p>`
            : ''
        }
        ${
          order.pickupDetails?.pickupTime
            ? `<p style="margin: 5px 0; font-size: 14px; color: #374151;"><strong>Pickup Time:</strong> ${order.pickupDetails.pickupTime}</p>`
            : ''
        }
        
        ${
          googleMapsLink
            ? `
          <div style="margin-top: 15px; border-top: 1px solid #dcfce7; padding-top: 15px;">
            <p style="margin: 0 0 10px 0; font-size: 13px; color: #166534; font-weight: bold;">Get Directions:</p>
            <a href="${googleMapsLink}" target="_blank" style="background: #00A86B; color: white; padding: 8px 16px; text-decoration: none; border-radius: 6px; display: inline-block; font-size: 12px; font-weight: bold; margin-right: 8px; margin-bottom: 8px;">Google Maps</a>
            <a href="${appleMapsLink}" target="_blank" style="background: #ffffff; color: #1f2937; border: 1px solid #d1d5db; padding: 8px 16px; text-decoration: none; border-radius: 6px; display: inline-block; font-size: 12px; font-weight: bold; margin-right: 8px; margin-bottom: 8px;">Apple Maps</a>
            <a href="${wazeLink}" target="_blank" style="background: #ffffff; color: #2563eb; border: 1px solid #d1d5db; padding: 8px 16px; text-decoration: none; border-radius: 6px; display: inline-block; font-size: 12px; font-weight: bold; margin-bottom: 8px;">Waze</a>
          </div>
          `
            : ''
        }
      </div>
      `
        : ''
    }

    <p style="color: #6b7280; font-size: 14px;">You can track your order in the app.</p>
  `;

  return sendEmail(
    email,
    `Order Confirmed - #${order.orderNumber}`,
    emailTemplate('Order Confirmed!', content)
  );
};

/**
 * Send order status update email
 */
const sendOrderStatusUpdateEmail = async (email, name, order, status) => {
  const statusMessages = {
    confirmed: 'Your order has been confirmed by the vendor.',
    ready_for_pickup: 'Your order is ready for pickup!',
    out_for_delivery: 'Your order is on the way!',
    completed: 'Your order has been completed. Thank you!',
    cancelled: 'Your order has been cancelled.',
  };

  const content = `
    <p>Hello ${name},</p>
    <p>${statusMessages[status] || 'Your order status has been updated.'}</p>
    <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <p style="margin: 5px 0;"><strong>Order Number:</strong> ${order.orderNumber}</p>
      <p style="margin: 5px 0;"><strong>New Status:</strong> <span style="text-transform: capitalize;">${status.replace(/_/g, ' ')}</span></p>
    </div>
    <p style="color: #6b7280; font-size: 14px;">View your order in the app for more details.</p>
  `;

  return sendEmail(
    email,
    `Order Update - #${order.orderNumber}`,
    emailTemplate('Order Update', content)
  );
};

/**
 * Send vendor order notification
 */
const sendVendorOrderNotification = async (email, businessName, order) => {
  const content = `
    <p>Hello ${businessName},</p>
    <p>You have received a new order. Please review and confirm it.</p>
    <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <p style="margin: 5px 0;"><strong>Order Number:</strong> ${order.orderNumber}</p>
      <p style="margin: 5px 0;"><strong>Total:</strong> ${order.pricing?.currency || 'RWF'} ${(order.pricing?.total || 0).toLocaleString()}</p>
      <p style="margin: 5px 0;"><strong>Status:</strong> ${order.status}</p>
    </div>
    <p style="color: #6b7280; font-size: 14px;">Log in to your vendor dashboard to manage this order.</p>
  `;

  return sendEmail(
    email,
    `New Order - #${order.orderNumber}`,
    emailTemplate('New Order Received', content)
  );
};

/**
 * Send admin notification (vendor approval, etc.)
 */
const sendAdminNotification = async (email, name, subject, message) => {
  const content = `
    <p>Hello ${name},</p>
    <p>${message}</p>
  `;

  return sendEmail(
    email,
    subject || 'ChopNow Admin Notification',
    emailTemplate(subject || 'Notification', content)
  );
};

/**
 * Send password changed confirmation
 */
const sendPasswordChangedConfirmation = async (email, name) => {
  const content = `
    <p>Hello ${name},</p>
    <p>Your password has been successfully changed.</p>
    <p style="color: #6b7280; font-size: 14px; margin-top: 20px;"><strong>Important:</strong> If you didn't make this change, please contact our support team immediately and reset your password.</p>
  `;

  return sendEmail(
    email,
    'Password Changed - ChopNow',
    emailTemplate('Password Changed Successfully', content)
  );
};

/**
 * Send order ready for pickup email with pickup code
 */
const sendOrderReadyForPickupEmail = async (email, name, order) => {
  const hasVendor = order.business && typeof order.business === 'object';
  const vendorName = hasVendor ? order.business.name : 'Vendor';
  const vendorAddress = hasVendor ? order.business.address : null;
  const coords = hasVendor && order.business.location?.coordinates;
  const googleMapsLink =
    coords && coords.length === 2 && coords[0] !== 0 && coords[1] !== 0
      ? `https://www.google.com/maps/dir/?api=1&destination=${coords[1]},${coords[0]}`
      : null;
  const appleMapsLink =
    coords && coords.length === 2 && coords[0] !== 0 && coords[1] !== 0
      ? `http://maps.apple.com/?daddr=${coords[1]},${coords[0]}`
      : null;
  const wazeLink =
    coords && coords.length === 2 && coords[0] !== 0 && coords[1] !== 0
      ? `https://waze.com/ul?ll=${coords[1]},${coords[0]}&navigate=yes`
      : null;

  const content = `
    <p>Hello ${name},</p>
    <p>Great news! Your order is ready for pickup.</p>
    
    <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center; border: 1px solid #e5e7eb;">
      <p style="margin: 5px 0;"><strong>Order Number:</strong> ${order.orderNumber}</p>
      <div style="margin: 20px 0;">
        <p style="margin: 0 0 10px 0; font-size: 12px; color: #6b7280; font-weight: bold; letter-spacing: 0.5px;">YOUR SCAN PASS</p>
        <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${order.pickupDetails?.pickupCode || 'N/A'}" width="150" height="150" alt="Pickup QR Code" style="display: block; margin: 0 auto; max-width: 100%; height: auto;" />
        <div style="background: #00A86B; color: white; font-size: 28px; font-weight: bold; letter-spacing: 6px; padding: 15px 30px; border-radius: 8px; display: inline-block; margin-top: 15px; font-family: monospace;">
          ${order.pickupDetails?.pickupCode || 'N/A'}
        </div>
      </div>
      <p style="margin: 15px 0 5px 0; font-size: 14px; color: #6b7280;">Show either the QR code or the code digits to the vendor.</p>
    </div>

    <div style="background: #f0fdf4; border-left: 4px solid #00A86B; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: left; font-family: sans-serif;">
      <h4 style="margin: 0 0 15px 0; color: #166534; font-size: 16px;">Vendor Location & Info</h4>
      <p style="margin: 5px 0; font-size: 14px; color: #374151;"><strong>Vendor Name:</strong> ${vendorName}</p>
      ${
        vendorAddress
          ? `<p style="margin: 5px 0; font-size: 14px; color: #374151;"><strong>Address:</strong> ${typeof vendorAddress === 'string' ? vendorAddress : JSON.stringify(vendorAddress)}</p>`
          : ''
      }
      ${
        order.pickupDetails?.pickupTime
          ? `<p style="margin: 5px 0; font-size: 14px; color: #374151;"><strong>Pickup Time:</strong> ${order.pickupDetails.pickupTime}</p>`
          : ''
      }
      
      ${
        googleMapsLink
          ? `
        <div style="margin-top: 15px; border-top: 1px solid #dcfce7; padding-top: 15px;">
          <p style="margin: 0 0 10px 0; font-size: 13px; color: #166534; font-weight: bold;">Get Directions:</p>
          <a href="${googleMapsLink}" target="_blank" style="background: #00A86B; color: white; padding: 8px 16px; text-decoration: none; border-radius: 6px; display: inline-block; font-size: 12px; font-weight: bold; margin-right: 8px; margin-bottom: 8px;">Google Maps</a>
          <a href="${appleMapsLink}" target="_blank" style="background: #ffffff; color: #1f2937; border: 1px solid #d1d5db; padding: 8px 16px; text-decoration: none; border-radius: 6px; display: inline-block; font-size: 12px; font-weight: bold; margin-right: 8px; margin-bottom: 8px;">Apple Maps</a>
          <a href="${wazeLink}" target="_blank" style="background: #ffffff; color: #2563eb; border: 1px solid #d1d5db; padding: 8px 16px; text-decoration: none; border-radius: 6px; display: inline-block; font-size: 12px; font-weight: bold; margin-bottom: 8px;">Waze</a>
        </div>
        `
          : ''
      }
    </div>

    <p style="color: #6b7280; font-size: 14px;">Please pick up your order as soon as possible to ensure freshness.</p>
  `;
  return sendEmail(
    email,
    `Your Order is Ready for Pickup - #${order.orderNumber}`,
    emailTemplate('Order Ready for Pickup!', content)
  );
};

/**
 * Send order out for delivery email
 */
const sendOrderOutForDeliveryEmail = async (email, name, order) => {
  const content = `
    <p>Hello ${name},</p>
    <p>Your order is on its way!</p>
    <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <p style="margin: 5px 0;"><strong>Order Number:</strong> ${order.orderNumber}</p>
      <p style="margin: 5px 0;"><strong>Total:</strong> ${order.pricing?.currency || 'RWF'} ${(order.pricing?.total || 0).toLocaleString()}</p>
      ${order.deliveryDetails?.address ? `<p style="margin: 5px 0;"><strong>Delivery Address:</strong> ${order.deliveryDetails.address.street || ''}, ${order.deliveryDetails.address.city || ''}</p>` : ''}
    </div>
    <p style="color: #6b7280; font-size: 14px;">Your rider is on the way. Please be ready to receive your order.</p>
  `;

  return sendEmail(
    email,
    `Your Order is On The Way - #${order.orderNumber}`,
    emailTemplate('Order Out for Delivery!', content)
  );
};

/**
 * Send order cancelled email to customer
 */
const sendOrderCancelledEmail = async (email, name, order, reason = '') => {
  const content = `
    <p>Hello ${name},</p>
    <p>We're sorry to inform you that your order has been cancelled.</p>
    <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <p style="margin: 5px 0;"><strong>Order Number:</strong> ${order.orderNumber}</p>
      <p style="margin: 5px 0;"><strong>Total:</strong> ${order.pricing?.currency || 'RWF'} ${(order.pricing?.total || 0).toLocaleString()}</p>
      ${reason ? `<p style="margin: 5px 0;"><strong>Reason:</strong> ${reason}</p>` : ''}
    </div>
    <p style="color: #6b7280; font-size: 14px;">If you were charged, a refund will be processed within 3-5 business days.</p>
    <p style="color: #6b7280; font-size: 14px; margin-top: 10px;">We apologize for any inconvenience. Please feel free to place a new order.</p>
  `;

  return sendEmail(
    email,
    `Order Cancelled - #${order.orderNumber}`,
    emailTemplate('Order Cancelled', content)
  );
};

/**
 * Send order cancelled notification to vendor
 */
const sendVendorOrderCancelledEmail = async (email, businessName, order, customerName) => {
  const content = `
    <p>Hello ${businessName},</p>
    <p>An order has been cancelled.</p>
    <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <p style="margin: 5px 0;"><strong>Order Number:</strong> ${order.orderNumber}</p>
      <p style="margin: 5px 0;"><strong>Customer:</strong> ${customerName}</p>
      <p style="margin: 5px 0;"><strong>Total:</strong> ${order.pricing?.currency || 'RWF'} ${(order.pricing?.total || 0).toLocaleString()}</p>
    </div>
    <p style="color: #6b7280; font-size: 14px;">Please update your inventory accordingly.</p>
  `;

  return sendEmail(
    email,
    `Order Cancelled - #${order.orderNumber}`,
    emailTemplate('Order Cancelled', content)
  );
};

/**
 * Send order completed/delivered email
 */
const sendOrderCompletedEmail = async (email, name, order) => {
  const content = `
    <p>Hello ${name},</p>
    <p>Your order has been completed. Thank you for helping reduce food waste!</p>
    <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <p style="margin: 5px 0;"><strong>Order Number:</strong> ${order.orderNumber}</p>
      <p style="margin: 5px 0;"><strong>Total:</strong> ${order.pricing?.currency || 'RWF'} ${(order.pricing?.total || 0).toLocaleString()}</p>
    </div>
    <div style="background: #E0F2ED; border-radius: 8px; padding: 15px; margin: 20px 0; text-align: center;">
      <p style="margin: 0; color: #007A4B; font-weight: bold;">You just helped save food from going to waste!</p>
    </div>
    <p style="color: #6b7280; font-size: 14px;">We'd love to hear your feedback. Please leave a review for the vendor.</p>
  `;

  return sendEmail(
    email,
    `Order Completed - #${order.orderNumber}`,
    emailTemplate('Order Completed!', content)
  );
};

/**
 * Send business verification approved email
 */
const sendBusinessApprovedEmail = async (email, businessName, ownerName, adminMessage = '') => {
  const dashboardUrl = `${APP_URL}/dashboard`;

  const messageSection = adminMessage
    ? `
    <div style="background: #f0fdf4; border-left: 4px solid #00A86B; padding: 15px; margin: 20px 0; border-radius: 0 8px 8px 0;">
      <p style="margin: 0 0 5px 0; font-weight: bold; color: #166534;">Message from ChopNow Admin:</p>
      <p style="margin: 0; color: #15803d;">${adminMessage}</p>
    </div>
  `
    : '';

  const content = `
    <p>Hello ${ownerName},</p>
    <p>Congratulations! Your business <strong>${businessName}</strong> has been verified and approved on ChopNow.</p>
    ${messageSection}
    <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <h3 style="margin: 0 0 15px 0; color: #1f2937;">What's Next?</h3>
      <ul style="margin: 0; padding-left: 20px; color: #4b5563;">
        <li style="margin-bottom: 10px;">Access your vendor dashboard to start managing your business</li>
        <li style="margin-bottom: 10px;">Add your first food listings to start selling</li>
        <li style="margin-bottom: 10px;">Set up your business hours and delivery options</li>
        <li>Start saving food and earning money!</li>
      </ul>
    </div>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${dashboardUrl}" style="background: #00A86B; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">Go to Dashboard</a>
    </div>
    <p style="color: #6b7280; font-size: 14px;">Thank you for joining ChopNow in our mission to reduce food waste across Africa!</p>
  `;

  return sendEmail(
    email,
    `Congratulations! ${businessName} is Now Approved on ChopNow`,
    emailTemplate('Business Approved!', content)
  );
};

/**
 * Send business verification rejected email
 */
const sendBusinessRejectedEmail = async (email, businessName, ownerName, reason = '') => {
  const content = `
    <p>Hello ${ownerName},</p>
    <p>We have reviewed your business verification application for <strong>${businessName}</strong>.</p>
    <p>Unfortunately, we were unable to approve your application at this time.</p>
    ${
      reason
        ? `
    <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0; border-radius: 0 8px 8px 0;">
      <p style="margin: 0 0 5px 0; font-weight: bold; color: #991b1b;">Reason:</p>
      <p style="margin: 0; color: #b91c1c;">${reason}</p>
    </div>
    `
        : ''
    }
    <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <h3 style="margin: 0 0 15px 0; color: #1f2937;">What You Can Do:</h3>
      <ul style="margin: 0; padding-left: 20px; color: #4b5563;">
        <li style="margin-bottom: 10px;">Review the rejection reason above</li>
        <li style="margin-bottom: 10px;">Update your business information or documents</li>
        <li style="margin-bottom: 10px;">Resubmit your verification application</li>
        <li>Contact our support team if you have questions</li>
      </ul>
    </div>
    <p style="color: #6b7280; font-size: 14px;">If you believe this decision was made in error, please contact our support team at chopnow.app@gmail.com.</p>
  `;

  return sendEmail(
    email,
    `Business Verification Update - ${businessName}`,
    emailTemplate('Business Verification Update', content)
  );
};

/**
 * Send business more info requested email
 */
const sendBusinessInfoRequestedEmail = async (email, businessName, ownerName, message = '') => {
  const dashboardUrl = `${APP_URL}/dashboard`;

  const content = `
    <p>Hello ${ownerName},</p>
    <p>We are reviewing your business verification application for <strong>${businessName}</strong>.</p>
    <p>To complete the verification process, we need some additional information from you.</p>
    ${
      message
        ? `
    <div style="background: #eff6ff; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0; border-radius: 0 8px 8px 0;">
      <p style="margin: 0 0 5px 0; font-weight: bold; color: #1e40af;">Information Requested:</p>
      <p style="margin: 0; color: #1d4ed8;">${message}</p>
    </div>
    `
        : ''
    }
    <div style="text-align: center; margin: 30px 0;">
      <a href="${dashboardUrl}" style="background: #3b82f6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">Update Your Application</a>
    </div>
    <p style="color: #6b7280; font-size: 14px;">Please provide the requested information as soon as possible so we can complete your verification.</p>
  `;

  return sendEmail(
    email,
    `Action Required: Additional Information Needed - ${businessName}`,
    emailTemplate('Additional Information Needed', content)
  );
};

/**
 * Send business rescinded (approval revoked) email
 */
const sendBusinessRescindedEmail = async (email, businessName, ownerName, reason = '') => {
  const dashboardUrl = `${APP_URL}/dashboard`;

  const content = `
    <p>Hello ${ownerName},</p>
    <p>We are writing to inform you that the verification status for <strong>${businessName}</strong> has been rescinded and your account has been moved back to pending review.</p>
    ${
      reason
        ? `
    <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 0 8px 8px 0;">
      <p style="margin: 0 0 5px 0; font-weight: bold; color: #92400e;">Reason:</p>
      <p style="margin: 0; color: #b45309;">${reason}</p>
    </div>
    `
        : ''
    }
    <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
      <p style="margin: 0 0 10px 0; font-weight: bold; color: #374151;">What This Means:</p>
      <ul style="margin: 0; padding-left: 20px; color: #4b5563;">
        <li>Your business account is currently on hold</li>
        <li>Your listings will not be visible to customers</li>
        <li>You may need to update your business information or documentation</li>
        <li>Once issues are resolved, you can request re-verification</li>
      </ul>
    </div>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${dashboardUrl}" style="background: #f59e0b; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">Review Your Account</a>
    </div>
    <p style="color: #6b7280; font-size: 14px;">If you have questions about this decision, please contact our support team at chopnow.app@gmail.com.</p>
  `;

  return sendEmail(
    email,
    `Important: Business Verification Status Update - ${businessName}`,
    emailTemplate('Verification Status Update', content)
  );
};

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendPasswordResetOTPEmail,
  sendOTPEmail,
  sendPasswordChangeOTP,
  sendSensitiveChangeOTP,
  sendOrderConfirmationEmail,
  sendOrderStatusUpdateEmail,
  sendVendorOrderNotification,
  sendAdminNotification,
  sendPasswordChangedConfirmation,
  sendOrderReadyForPickupEmail,
  sendOrderOutForDeliveryEmail,
  sendOrderCancelledEmail,
  sendVendorOrderCancelledEmail,
  sendOrderCompletedEmail,
  sendBusinessApprovedEmail,
  sendBusinessRejectedEmail,
  sendBusinessInfoRequestedEmail,
  sendBusinessRescindedEmail,
};
