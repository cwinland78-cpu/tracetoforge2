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
        <p className="text-sm text-[#666680] font-mono mb-12">Last updated: April 17, 2026</p>

        <div className="prose prose-invert max-w-none space-y-8 text-[#AAABB8] leading-relaxed">
          <section>
            <h2 className="text-xl md:text-2xl font-display font-bold text-white mb-3">Agreement</h2>
            <p>
              By using TracetoForge (tracetoforge.com), you agree to these Terms of Service. If you
              do not agree, please do not use the site. TracetoForge is operated by Qwikymart LLC.
            </p>
          </section>

          <section>
            <h2 className="text-xl md:text-2xl font-display font-bold text-white mb-3">The Service</h2>
            <p>
              TracetoForge is a browser-based tool that converts photos of physical objects into
              3D-printable files (STL, 3MF, SVG, DXF). We provide the software. You provide the
              photos, the dimensions, and the judgment about how the output will be used.
            </p>
          </section>

          <section>
            <h2 className="text-xl md:text-2xl font-display font-bold text-white mb-3">Accounts</h2>
            <p className="mb-3">
              You may need an account to save projects or purchase export credits. You are
              responsible for keeping your password secure and for any activity under your account.
            </p>
            <p>
              You must be at least 13 years old to create an account. If you are under 18, you
              represent that you have parental permission to use the service.
            </p>
          </section>

          <section>
            <h2 className="text-xl md:text-2xl font-display font-bold text-white mb-3">Credits and Payments</h2>
            <p className="mb-3">
              New accounts receive 3 free export credits. Additional credits can be purchased in
              packs (currently 20 credits for $9.99 or 100 credits for $34.99). Prices are subject
              to change. Credits do not expire.
            </p>
            <p className="mb-3">
              Payments are processed by Stripe via RevenueCat. We do not store payment card details.
            </p>
            <p>
              Credits are non-refundable once consumed. If you experience an issue with a purchase,
              email support@tracetoforge.com and we will work with you to resolve it.
            </p>
          </section>

          <section>
            <h2 className="text-xl md:text-2xl font-display font-bold text-white mb-3">Acceptable Use</h2>
            <p className="mb-3">You agree not to:</p>
            <ul className="list-disc list-inside space-y-2 pl-2">
              <li>Use the service to create functional firearms, firearm components, or weapons</li>
              <li>Use the service to infringe the intellectual property rights of others</li>
              <li>Attempt to reverse engineer, scrape, or automate the service in ways that disrupt it</li>
              <li>Use the service to harass, abuse, or harm other users</li>
              <li>Bypass credit limits or payment requirements</li>
              <li>Upload content that contains malware or exploits</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl md:text-2xl font-display font-bold text-white mb-3">Your Content</h2>
            <p className="mb-3">
              You retain all rights to the photos you upload and the files you generate. We do not
              claim ownership of your designs.
            </p>
            <p>
              You grant us a limited license to process your uploaded photos for the sole purpose of
              running the edge detection and export pipeline. We do not use your content for training,
              marketing, or any other purpose.
            </p>
          </section>

          <section>
            <h2 className="text-xl md:text-2xl font-display font-bold text-white mb-3">Intellectual Property and Third-Party Brands</h2>
            <p className="mb-3">
              TracetoForge, the TracetoForge logo, and the underlying software are owned by
              Qwikymart LLC.
            </p>
            <p>
              Third-party brand names mentioned on this site (including but not limited to Milwaukee,
              Packout, DeWalt, ToughSystem, Gridfinity, Knipex, Klein, Wera, Wiha, Estwing, Craftsman,
              Kobalt, Husky, Harbor Freight, and Icon) are trademarks of their respective owners and
              are used only to describe compatibility. TracetoForge is not affiliated with, endorsed
              by, or sponsored by these companies.
            </p>
          </section>

          <section>
            <h2 className="text-xl md:text-2xl font-display font-bold text-white mb-3">Disclaimer of Warranties</h2>
            <p>
              The service is provided "as is" and "as available" without warranties of any kind,
              either express or implied. We do not warrant that the service will be uninterrupted,
              error-free, or that the files it generates will meet your specific requirements. 3D
              printing involves physical materials and machines; results depend on your printer,
              filament, and print settings. You are responsible for verifying fit and function before
              depending on any printed part.
            </p>
          </section>

          <section>
            <h2 className="text-xl md:text-2xl font-display font-bold text-white mb-3">Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by law, Qwikymart LLC and its operators will not be
              liable for any indirect, incidental, special, consequential, or punitive damages
              arising from your use of the service. Our total liability for any claim relating to
              the service is limited to the amount you paid us in the 12 months preceding the claim.
            </p>
          </section>

          <section>
            <h2 className="text-xl md:text-2xl font-display font-bold text-white mb-3">Termination</h2>
            <p>
              We may suspend or terminate your access if you violate these terms. You may close your
              account at any time by emailing support@tracetoforge.com.
            </p>
          </section>

          <section>
            <h2 className="text-xl md:text-2xl font-display font-bold text-white mb-3">Changes to These Terms</h2>
            <p>
              We may update these terms from time to time. When we do, we will update the "Last
              updated" date. Continued use of the service after changes means you accept the new
              terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl md:text-2xl font-display font-bold text-white mb-3">Contact</h2>
            <p>
              Questions? Email{' '}
              <a href="mailto:support@tracetoforge.com" className="text-brand underline hover:no-underline">
                support@tracetoforge.com
              </a>.
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
