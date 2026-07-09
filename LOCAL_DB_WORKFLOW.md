# Local Supabase Development Workflow

If you are worried about hitting cloud usage limits (billing quotas) for Realtime or Database size while testing and developing your SaaS CRM, switching to the **Local Supabase Environment** is absolutely the right move! 

By running Supabase locally, your app connects to a Supabase node running *on your own computer* using Docker. **This is completely free and consumes 0 cloud bandwidth**. When you are done building your features, you push the final schema up to Production.

Here is the exact step-by-step guide to get this running for Hotel Taj Ooty:

## Step 1: Install Dependencies
1. Install [Docker Desktop](https://www.docker.com/products/docker-desktop/) and make sure it is running in the background.
2. Ensure you have the Supabase CLI installed. Run this in your terminal:
   ```bash
   npm install supabase --save-dev
   ```

## Step 2: Initialize & Link Your Project
Open a fresh terminal in your project (`taj-ooty-website`) and run:
```bash
npx supabase init
```
*(This sets up your local `supabase/` folder containing the basic configurations).*

Next, log into your Supabase account from the terminal so it has access to your live CRM DB:
```bash
npx supabase login
```

Now, link your local files to your live Hotel Taj project on the cloud. You need your Project Reference ID (found in your Supabase Dashboard settings URL: `https://supabase.com/dashboard/project/YOUR_REF_ID`).
```bash
npx supabase link --project-ref <YOUR_LIVE_PROJECT_REF>
```

## Step 3: Pull Your Live Data Down
You need to pull down the database structure we just spent hours building! Run:
```bash
npx supabase db pull
```
This generates migration files matching *exactly* what your live production DB looks like right now! (You should commit these files to your Git repository).

## Step 4: Start the Local Database!
Run this command to fire up the Supabase stack on your computer:
```bash
npx supabase start
```
*Note: The first time you run this, it will take several minutes to download the Docker images.* 

Once completed, the terminal will print out local URLs and Local Keys for your `.env.local` file:
```
API URL: http://127.0.0.1:54321
anon key: eyJhbGci...
service_role key: eyJhbGci...
```
You now have a full local Supabase Dashboard instantly accessible at **http://127.0.0.1:54323**!

## Step 5: Switch your Environment Variables
Create a backup of your current `.env.local` (e.g. rename it to `.env.production`) so you don't lose your live keys.
Then, edit `.env.local` and replace the keys with the **Local Details** provided by `supabase start`:

```env
NEXT_PUBLIC_SUPABASE_URL="http://127.0.0.1:54321"
NEXT_PUBLIC_SUPABASE_ANON_KEY="<local-anon-key-from-terminal>"
SUPABASE_SERVICE_ROLE_KEY="<local-service-role-key-from-terminal>"
# Keep your site URL the same for testing
NEXT_PUBLIC_SITE_URL="http://localhost:3000"
```
Reboot your Next.js server (`npm run dev`), and your Next.js app is now completely offline and hitting your local machine's database! 🚀 You have absolutely 0 quota usage!

---

## Moving Forward to Production

When you make new tables or changes over the next few weeks, you make them in your Local dashboard. 

When you want to sync those new changes up to the LIVE database, you just run:
```bash
npx supabase db push
```

And for your Vercel (or hosting provider) deployment, you simply give Vercel your original **Live Project Keys** for production! Your local environment safely stays local.
