# Deployment Guide

## Git Push

Your changes have been committed locally. To push to GitHub, you need to authenticate:

### Option 1: Use GitHub CLI (Recommended)
```bash
gh auth login
git push origin main
```

### Option 2: Use Personal Access Token
1. Go to GitHub Settings → Developer settings → Personal access tokens
2. Create a token with `repo` permissions
3. Use it as password when pushing:
```bash
git push origin main
# Username: your-github-username
# Password: your-personal-access-token
```

### Option 3: Switch to SSH
```bash
git remote set-url origin git@github.com:Daanveer10/medcair-2.git
git push origin main
```

## Vercel Deployment

### Prerequisites
1. Vercel account (sign up at https://vercel.com)
2. Supabase project with database schema applied

### Steps

1. **Set up Supabase Database:**
   - Go to your Supabase project dashboard
   - Navigate to SQL Editor
   - Run the SQL script from `supabase-schema.sql`

2. **Deploy to Vercel:**

   **Option A: Using Vercel CLI (Current)**
   ```bash
   vercel
   ```
   Follow the prompts to link your project.

   **Option B: Using Vercel Dashboard**
   - Go to https://vercel.com/new
   - Import your GitHub repository
   - Vercel will auto-detect Next.js settings

3. **Set Environment Variables in Vercel:**
   Go to your project settings → Environment Variables and add:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Redeploy after adding environment variables:**
   - Go to Deployments tab
   - Click the three dots on the latest deployment
   - Select "Redeploy"

## Post-Deployment Checklist

- [ ] Database schema applied in Supabase
- [ ] Environment variables set in Vercel
- [ ] Test patient signup/login
- [ ] Test hospital signup/login
- [ ] Test clinic search
- [ ] Test appointment booking
- [ ] Verify RLS policies are working

## Troubleshooting

### Database Connection Issues
- Verify environment variables are set correctly
- Check Supabase project is active
- Ensure RLS policies allow necessary operations

### Build Errors
- Check that all dependencies are in package.json
- Verify TypeScript types are correct
- Check Next.js version compatibility
