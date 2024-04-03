//     This file is part of Cosmic Reach Mod Manager.
//
//    Cosmic Reach Mod Manager is free software: you can redistribute it and/or modify it under the terms of the GNU Affero General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.
//
//    Cosmic Reach Mod Manager is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.
//
//   You should have received a copy of the GNU General Public License along with Cosmic Reach Mod Manager. If not, see <https://www.gnu.org/licenses/>.

export const NewPasswordConfirmationEmailTemplate = ({
	name,
	confirmationPageUrl,
	siteUrl,
	expiryDurationMs,
}: {
	name?: string;
	confirmationPageUrl: string;
	siteUrl: string;
	expiryDurationMs?: number;
}) => {
	const EmailHTML = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta content="IE=edge" http-equiv="X-UA-Compatible"><meta content="width=device-width,initial-scale=1" name="viewport"><meta name="theme-color" content="#151719"><title>Verify your new password</title></head><body style="width:100%;padding:0;margin:0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;color:#fff;background-color:#151719;padding:32px 0"><table cellspacing="0" style="margin:auto;max-width:400px;background-color:#252729;border-radius:8px;padding:32px"><tr><td><h1 style="width:100%;text-align:center;font-size:20px;line-height:24px;color:#f43f5e">Verify your new password</h1></td></tr><tr><td><p>Hi ${
		name || "there"
	},<br>A new password was recently added to your account. Confirm below if this was you. The new password will not work until then.</p></td></tr><tr style="width:100%"><td style="width:100%"><a href="${confirmationPageUrl}" style="width:100%;text-decoration:none;margin:0;padding:0" data-saferedirecturl="${confirmationPageUrl}"><p style="width:100%;font-size:20px;background-color:#f43f5e;text-align:center;text-decoration:none;color:#fff;padding:6px 0;border-radius:8px;margin:4px 0">Verify</p></a><span style="color:#c5c7c9">Open the link for more details and options</span></td></tr><tr><td><p style="color:#d0d2d5">If the above link didn't work, copy and paste this url in the browser<br><a href="${confirmationPageUrl}" style="text-decoration:none;color:#60a5fa" data-saferedirecturl="${confirmationPageUrl}">${confirmationPageUrl}</a></p></td></tr>${
		expiryDurationMs
			? `<tr><td><p style="color:#d0d2d5">This link is valid for <span style="font-weight: 600;">${Math.round(
					expiryDurationMs / (60 * 1000),
			  )} minutes</span></p></td></tr>`
			: ""
	}<tr style="width:100%"><td style="width:100%"><div style="width:100%;height:1px;background-color:#a5a7a9"></div></td></tr><tr style="width:100%;text-align:center"><td style="width:100%;text-align:center"><a href="${siteUrl}" style="color:#60a5fa;text-decoration:none"><p>Cosmic Reach Mod Manager</p></a></td></tr></table></body></html>`;
	const subject = "Verify your new password";
	const text = `Hi ${
		name || "there"
	},\nA new password was recently added to your account. Confirm below if this was you. The new password will not work until then.\nOpen the link for more details and options\n${confirmationPageUrl}\n${
		expiryDurationMs
			? `This link is valid for ${Math.round(
					expiryDurationMs / (60 * 1000),
			  )} minutes`
			: ""
	}\n\nCosmic Reach Mod Manager`;

	return { EmailHTML, subject, text };
};

export const ChangePasswordVerificationEmailTemplate = ({
	name,
	confirmationPageUrl,
	siteUrl,
	expiryDurationMs,
}: {
	name?: string;
	confirmationPageUrl: string;
	siteUrl: string;
	expiryDurationMs?: number;
}) => {
	const EmailHTML = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><meta name="theme" content="#252729"><title>Email template</title></head><body style="margin: 0; padding: 0; width: 100%; display: flex; align-items: center; justify-content: center; background-color: #17191C; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto' , 'Oxygen' , 'Ubuntu' , 'Cantarell' , 'Fira Sans', 'Droid Sans' , 'Helvetica Neue' , sans-serif;"><table width="100%" border="0" cellspacing="0" cellpadding="0" style="width:100%!important"><tbody><tr><td align="center"><table style="border: 1px solid #85878A; border-radius: 8px; margin: 48px 0; background-color: #121417;"><tbody><tr><td style="padding: 48px; width: 100%; max-width: 375px;"><table width="100%" cellspacing="0" cellpadding="0"><tbody><tr><td align="center"> <img src="https://i.postimg.cc/1XrDxkqz/image.png" style="width: 64px; height: 64px;"/> </td></tr><tr><td align="center"><h1 style="color: white; font-weight: 400; font-size: 1.6rem; margin-top: 4px; margin-bottom: 12px;">Change your password </h1></td></tr></tbody></table><table width="100%" cellspacing="0" cellpadding="0"><tbody><tr><td style="padding-top: 16px; margin-bottom: 0;"><p style="color: #D0D2D5; margin-top: 8px; margin-bottom: 0; font-size: 14px;">Hi ${
		name || "there"
	},</p></td></tr><tr><td style="margin-top: 0;"><p style="color: #D0D2D5; margin-bottom: 8px; padding-top: 0; font-size: 14px;">We received a request to change your password. Click the link below to change your account password.</p></td></tr></tbody></table><table width="100%" cellspacing="0" cellpadding="0"><tbody><tr><td align="center" style="padding-top: 8px; padding-bottom: 12px;"> <a href="${confirmationPageUrl}" data-saferedirecturl="${confirmationPageUrl}" style="text-decoration: none;"><p style="background-color: #f43f5e; color: white; width: fit-content; padding: 8px 32px 12px 32px; border-radius: 8px; font-size: 14px;">Change password</p></a> </td></tr><tr><td><p style="color: #D0D2D5; margin: 8px; font-size: 14px;">This link is valid for <span style="font-weight: 600;">${Math.round(
		expiryDurationMs / (60 * 1000),
	)} minutes</span></p></td></tr><tr><td><div style="width: 100%; height: 1px; background-color: #85878A; margin: 16px 0;"></div></td></tr><tr><td align="center"> <a href="${siteUrl}" style="color: #60a5fa; text-decoration: none;"><p style="color:white; text-decoration: underline; text-underline-offset: 2px;">Cosmic Reach Mod Manager</p></a> </td></tr></tbody></table></td></tr></tbody></table></td></tr></tbody></table></body> </html>`;

	const subject = "Change your CRMM account password";
	const text = `Hi ${
		name || "there"
	},\nOpen the link to change your account password.\n${confirmationPageUrl}${
		expiryDurationMs
			? `\nThis link is valid for${Math.round(
					expiryDurationMs / (60 * 1000),
			  )} minutes`
			: ""
	}\n\nCosmic Reach Mod Manager`;

	return { EmailHTML, subject, text };
};
