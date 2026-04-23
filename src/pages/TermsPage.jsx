import React from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

export default function TermsPage() {
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
          Terms of Service
        </h1>
        <p className="text-sm text-[#666680] font-mono mb-12">Last updated: April 22, 2026</p>

        <div className="prose prose-invert max-w-none space-y-8 text-[#AAABB8] leading-relaxed">
          <section>
            <p>
              These Terms of Service ("Terms") govern your use of tracetoforge.com (the "Service"),
              operated by Qwikymart LLC ("we," "us," "our"). By accessing or using the Service, you
              agree to be bound by these Terms. If you do not agree, do not use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl md:text-2xl font-display font-bold text-white mb-3">The Service</h2>
            <p>
              TracetoForge is a browser-based application that converts photos of physical objects
              into 3D-printable files in STL, 3MF, SVG, and DXF formats. The core tracing and preview
              functions are free. Exporting downloadable files requires export credits.
            </p>
          </section>

          <section>
            <h2 className="text-xl md:text-2xl font-display font-bold text-white mb-3">Eligibility</h2>
            <p>
              You must be at least 13 years old to use the Service. If you are between 13 and 18, you
              must have permission from a parent or legal guardian. By using the Service, you represent
              that you meet these requirements.
            </p>
          </section>

          <section>
            <h2 className="text-xl md:text-2xl font-display font-bold text-white mb-3">Accounts</h2>
            <p>
              You can use the editor without an account, but creating an account is required to save
              projects, retain export credits, and access purchase history. You are responsible for
              keeping your password secure and for all activity that occurs under your account. Notify
              us immediately at{' '}
              <a href="mailto:support@tracetoforge.com" className="text-brand underline hover:no-underline">
                support@tracetoforge.com
              </a>{' '}
              if you suspect unauthorized access.
            </p>
          </section>

          <section>
            <h2 className="text-xl md:text-2xl font-display font-bold text-white mb-3">Credits and Payments</h2>
            <p className="mb-3">
              <strong className="text-white">How credits work.</strong> One export credit allows one
              file download. New accounts receive three free export credits on signup. Additional
              credits are sold in packs: 20 credits for $9.99 or 100 credits for $34.99. Credits do
              not expire.
            </p>
            <p className="mb-3">
              <strong className="text-white">Payment processing.</strong> Payments are processed by
              Stripe through RevenueCat. We do not store your full payment information. Prices are in
              U.S. dollars and exclude any applicable taxes, which may be collected by Stripe based on
              your billing location.
            </p>
            <p className="mb-3">
              <strong className="text-white">Refunds.</strong> Credits that have not yet been spent on
              an export are refundable within 14 days of purchase. Email support@tracetoforge.com with
              your order ID to request a refund. Credits that have already been used to generate a
              downloadable file are non-refundable.
            </p>
            <p>
              <strong className="text-white">Pricing changes.</strong> We may change credit pack prices
              at any time. Existing unused credits are not affected by price changes.
            </p>
          </section>

          <section>
            <h2 className="text-xl md:text-2xl font-display font-bold text-white mb-3">Acceptable Use</h2>
            <p className="mb-3">You agree not to use the Service to do any of the following:</p>
            <ul className="list-disc list-inside space-y-2 pl-2">
              <li>Attempt to gain unauthorized access to other user accounts, our backend systems, or third-party services we use</li>
              <li>Reverse-engineer, decompile, or attempt to extract the source code of the Service beyond what is permitted by law</li>
              <li>Use automated tools, scrapers, or bots to interact with the Service in ways that degrade performance for other users</li>
              <li>Upload images that contain content you do not have the right to use</li>
              <li>Use the Service to create files that infringe the intellectual property rights of others</li>
              <li>Use the Service to create weapons, weapon components, or items prohibited by applicable law</li>
              <li>Resell, sublicense, or commercially redistribute access to the Service itself</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl md:text-2xl font-display font-bold text-white mb-3">Intellectual Property</h2>
            <p className="mb-3">
              <strong className="text-white">Your content.</strong> You retain all rights to the photos
              you upload and the files you export. We claim no ownership over your designs.
            </p>
            <p className="mb-3">
              <strong className="text-white">License to operate the Service.</strong> By uploading a
              photo or saving a project, you grant us a limited, non-exclusive license to process,
              store (where applicable), and display that content as needed to operate the Service for
              you. This license ends when you delete the content or your account.
            </p>
            <p>
              <strong className="text-white">Our content.</strong> The TracetoForge name, logo, blog
              posts, marketing copy, and editor interface are owned by Qwikymart LLC and protected by
              copyright, trademark, and other intellectual property laws.
            </p>
          </section>

          <section>
            <h2 className="text-xl md:text-2xl font-display font-bold text-white mb-3">Third-Party Trademarks</h2>
            <p>
              Milwaukee, Packout, DeWalt, ToughSystem, TSTAK, Gridfinity, Knipex, Klein, Wera, Bosch,
              Festool, Makita, Ridgid, Snap-on, Kobalt, Husky, Craftsman, Stanley, FatMax, Bambu,
              Prusa, and all other brand and product names referenced on this site are trademarks of
              their respective owners. They are used here only to describe compatibility and are not
              affiliated with, endorsed by, or sponsored by their owners.
            </p>
          </section>

          <section>
            <h2 className="text-xl md:text-2xl font-display font-bold text-white mb-3">Disclaimer of Warranties</h2>
            <p>
              The Service is provided "as is" and "as available" without warranties of any kind, either
              express or implied, including warranties of merchantability, fitness for a particular
              purpose, and non-infringement. We do not warrant that the Service will be uninterrupted,
              error-free, or that exports will be perfectly dimensioned for any particular tool. Always
              test fit a printed sample before printing in volume.
            </p>
          </section>

          <section>
            <h2 className="text-xl md:text-2xl font-display font-bold text-white mb-3">Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by law, Qwikymart LLC shall not be liable for any
              indirect, incidental, special, consequential, or punitive damages, or any loss of
              profits, revenue, data, or use, arising out of or in connection with the Service. Our
              total liability for any claim arising out of these Terms or the Service is limited to
              the amount you paid us in the 12 months preceding the claim, or $50, whichever is greater.
            </p>
          </section>

          <section>
            <h2 className="text-xl md:text-2xl font-display font-bold text-white mb-3">Indemnification</h2>
            <p>
              You agree to indemnify and hold harmless Qwikymart LLC and its officers and operators
              from any claims, damages, or expenses arising out of your use of the Service, your
              violation of these Terms, or your infringement of any third party's rights.
            </p>
          </section>

          <section>
            <h2 className="text-xl md:text-2xl font-display font-bold text-white mb-3">Account Termination</h2>
            <p>
              You can delete your account at any time by emailing support@tracetoforge.com. We may
              suspend or terminate your account if you violate these Terms or use the Service in a way
              that creates risk or legal exposure for us or for other users. On termination, your saved
              projects and unused credits may be lost.
            </p>
          </section>

          <section>
            <h2 className="text-xl md:text-2xl font-display font-bold text-white mb-3">Changes to These Terms</h2>
            <p>
              We may update these Terms from time to time. The "Last updated" date at the top of this
              page reflects the most recent revision. Significant changes will be announced on the
              site or by email. Continued use of the Service after changes indicates acceptance of the
              updated Terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl md:text-2xl font-display font-bold text-white mb-3">Governing Law</h2>
            <p>
              These Terms are governed by the laws of the State of Ohio, United States, without regard
              to its conflict of law principles. Any dispute arising out of these Terms or the Service
              will be resolved in the state or federal courts located in Cuyahoga County, Ohio.
            </p>
          </section>

          <section>
            <h2 className="text-xl md:text-2xl font-display font-bold text-white mb-3">Contact</h2>
            <p>
              Questions about these Terms? Email{' '}
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
