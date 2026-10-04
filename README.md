# AI-MoneySafe
AI-MoneySafe is an intelligent personal finance app that helps you track expenses, manage budgets, analyze spending, and understand your financial habits. Use AI to capture transactions from receipts and statements, get personalized insights, monitor recurring expenses, and make smarter financial decisions.

## Render Backend

Deploy the API as a Render Web Service with `backend` as the root directory and `npm start` as the start command. Configure `DATABASE_URL`, `JWT_SECRET` (at least 32 characters), and `GEMINI_API_KEY` in the service environment. Add the Cloudinary variables when profile or receipt image uploads are enabled.

Budget push alerts run separately from the API. Create a Render Cron Job from the same repository with `backend` as its root directory, `npm ci` as its build command, and `npm run budget-alerts` as its command. Set its schedule to `0 9 * * *` (09:00 UTC daily) and give it the same `DATABASE_URL` as the API. The mobile app must register its Expo push token with the authenticated `POST /api/auth/push-token` endpoint for notifications to be delivered.
