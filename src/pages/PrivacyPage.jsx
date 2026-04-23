import React from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-bg text-text">
      <nav className="max-w-4xl mx-auto px-6 py-6 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 text-sm text-[#8888A0] hover:text-white transition-colors">
          <ArrowLeft size={16} />
          Back to TracetoForge
        </Link>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-12 md:py-16">
        <h1 className="text-3xl md:text-5xl font-display font-extrabold tracking-tight mb-4">
          Privacy Policy
        </h1>
        <p className="text-sm text-[#666680] font-mono mb-12">Last updated: April 22, 2026</p>

        <div className="prose prose-invert max-w-none space-y-8 text-[#AAABB8] leading-relaxed">
          <section>
            <h2 className="text-xl md:text-2xl font-display font-bold text-white mb-3">Overview</h2>
            <p>
              TracetoForge is operated by Qwikymart LLC ("we", "us", "our"). This Privacy Policy
              explains what information we collect when you use tracetoforge.com, how we use it,
              and the choices you have. We aim to keep this simple and readable.
            </p>
          </section>

          <section>
            <h2 className="text-xl md:text-2xl font-display font-bold text-white mb-3">Information We Collect</h2>
            <p className="mb-3">
              <strong className="text-white">Account information.</strong> If you create an account,
              we collect your email address and a hashed password. We do not collect your real name,
              physical address, or phone number.
            </p>
            <p className="mb-3">
              <strong className="text-white">Usage data.</strong> We collect standard web analytics
              data such as pages viewed, time spent on site, referring URL, approximate location
              (city/country level), browser type, and device type. This helps us improve the product.
            </p>
            <p className="mb-3">
              <strong className="text-white">Your photos and designs.</strong> When you upload a photo
              of your tools, the image is processed entirely in your browser using client-side edge
              detection. Your photos are not uploaded to our servers unless you explicitly save a
              project to your account. Saved project data (tool dimensions, settings, thumbnails)
              is stored in our database.
            </p>
            <p>
              <strong className="text-white">Purchase information.</strong> If you purchase export
              credits, payments are processed by Stripe via RevenueCat. We never see or store your
              credit card information. We only receive a confirmation that payment succeeded and a
              transaction ID.
            </p>
          </section>

          <section>
            <h2 className="text-xl md:text-2xl font-display font-bold text-white mb-3">Cookies and Tracking</h2>
            <p className="mb-3">
              We use cookies and similar technologies for essential site functionality (keeping you
              signed in), analytics, and advertising.
            </p>
            <p>
              <strong className="text-white">Third-party cookies:</strong> We use Google Analytics,
              Google Ads (for conversion tracking), and Google AdSense. These services may place
              cookies on your device to measure site usage and serve ads.
            </p>
          </section>

          <section>
            <h2 className="text-xl md:text-2xl font-display font-bold text-white mb-3">Advertising and Google AdSense</h2>
            <p className="mb-3">
              This site uses Google AdSense to display advertisements. Google and its partners use
              cookies to serve ads based on your prior visits to this site and other sites on the
              internet.
            </p>
            <p className="mb-3">
              Google's use of advertising cookies enables it and its partners to serve ads to you
              based on your visit to our site and other sites on the internet. You may opt out of
              personalized advertising by visiting{' '}
              <a
                href="https://www.google.com/settings/ads"
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand underline hover:no-underline"
              >
                Google Ads Settings
              </a>.
            </p>
            <p>
              You can also opt out of third-party vendor use of cookies for personalized advertising
              by visiting{' '}
              <a
                href="https://www.aboutads.info/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand underline hover:no-underline"
              >
                aboutads.info
              </a>.
            </p>
          </section>

          <section>
            <h2 className="text-xl md:text-2xl font-display font-bold text-white mb-3">Third Parties We Use</h2>
            <ul className="list-disc list-inside space-y-2 pl-2">
              <li><strong className="text-white">Supabase</strong> — authentication and database hosting</li>
              <li><strong className="text-white">Cloudflare</strong> — website hosting, DNS, and DDoS protection</li>
              <li><strong className="text-white">Google Analytics</strong> — website usage analytics</li>
              <li><strong className="text-white">Google AdSense</strong> — advertising</li>
              <li><strong className="text-white">Google Ads</strong> — conversion tracking</li>
              <li><strong className="text-white">Stripe (via RevenueCat)</strong> — payment processing</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl md:text-2xl font-display font-bold text-white mb-3">How We Use Your Information</h2>
            <ul className="list-disc list-inside space-y-2 pl-2">
              <li>To operate the site and provide the photo-to-STL service</li>
              <li>To manage your account and saved projects</li>
              <li>To process payments and grant export credits</li>
              <li>To improve the product based on usage patterns</li>
              <li>To respond to support requests</li>
              <li>To display advertisements</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl md:text-2xl font-display font-bold text-white mb-3">Data Retention</h2>
            <p>
              We keep your account data for as long as your account is active. You can request
              account deletion by emailing support@tracetoforge.com. Web analytics data is retained
              according to the default retention policy of our analytics providers (typically 26 months).
            </p>
          </section>

          <section>
            <h2 className="text-xl md:text-2xl font-display font-bold text-white mb-3">Your Rights</h2>
            <p className="mb-3">
              Depending on your location, you may have the right to access the personal information
              we hold about you, correct inaccurate information, request deletion of your information,
              object to or restrict certain types of processing, request a copy of your data in a
              portable format, and withdraw consent where we rely on consent to process your data. To
              exercise any of these rights, email support@tracetoforge.com from the email address on
              your account.
            </p>
            <p className="mb-3">
              <strong className="text-white">California residents:</strong> Under the California
              Consumer Privacy Act (CCPA), you have additional rights regarding the categories of
              personal information we collect, the sources we collect it from, the business purpose
              for collection, and the right to opt out of the sale of personal information. We do not
              sell personal information.
            </p>
            <p>
              <strong className="text-white">European users:</strong> Under the GDPR, our legal bases
              for processing are contract performance (operating the service for you), legitimate
              interest (analytics and product improvement), consent (advertising cookies), and legal
              obligation (tax records).
            </p>
          </section>

          <section>
            <h2 className="text-xl md:text-2xl font-display font-bold text-white mb-3">Security</h2>
            <p>
              We use industry-standard security measures to protect your data, including encrypted
              connections (HTTPS), hashed passwords, encrypted database backups, and access controls
              on our backend systems. No system is perfectly secure, but we work to limit risk.
            </p>
          </section>

          <section>
            <h2 className="text-xl md:text-2xl font-display font-bold text-white mb-3">International Data Transfers</h2>
            <p>
              TracetoForge is operated from the United States. If you access the site from outside the
              United States, your information may be transferred to, stored in, and processed in the
              United States and other countries where our service providers operate.
            </p>
          </section>

          <section>
            <h2 className="text-xl md:text-2xl font-display font-bold text-white mb-3">Children's Privacy</h2>
            <p>
              TracetoForge is not directed at children under 13. We do not knowingly collect personal
              information from children under 13. If we learn that a child under 13 has provided
              personal information, we will delete it.
            </p>
          </section>

          <section>
            <h2 className="text-xl md:text-2xl font-display font-bold text-white mb-3">Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. When we do, we will update the
              "Last updated" date at the top of this page. Significant changes will be noted on the
              site.
            </p>
          </section>

          <section>
            <h2 className="text-xl md:text-2xl font-display font-bold text-white mb-3">Contact</h2>
            <p>
              Questions about this policy? Email us at{' '}
              <a href="mailto:support@tracetoforge.com" className="text-brand underline hover:no-underline">
                support@tracetoforge.com
              </a>.
            </p>
            <p className="mt-3 text-sm text-[#666680]">
              TracetoForge is operated by Qwikymart LLC.
            </p>
          </section>
        </div>

        <div className="mt-16 pt-8 border-t border-surface-lighter/20 text-center">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-[#8888A0] hover:text-white transition-colors"
          >
            <ArrowLeft size={16} />
            Back to TracetoForge
          </Link>
        </div>
      </main>
    </div>
  )
}
