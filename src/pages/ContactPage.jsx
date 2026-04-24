import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

export default function ContactPage() {
  const [name, setName] = useState('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')

  const handleSend = (e) => {
    e.preventDefault()
    const body = encodeURIComponent(
      `${message}\n\n---\nFrom: ${name || '(no name provided)'}`
    )
    const subj = encodeURIComponent(subject || 'TracetoForge contact form')
    window.location.href = `mailto:support@tracetoforge.com?subject=${subj}&body=${body}`
  }

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
          Contact TracetoForge
        </h1>
        <p className="text-sm text-[#666680] font-mono mb-12">Real email, read by a real person.</p>

        <div className="prose prose-invert max-w-none space-y-8 text-[#AAABB8] leading-relaxed">
          <section>
            <h2 className="text-xl md:text-2xl font-display font-bold text-white mb-3">Email us directly</h2>
            <p className="mb-3">
              The fastest way to reach us is email:{' '}
              <a href="mailto:support@tracetoforge.com" className="text-brand underline hover:no-underline">
                support@tracetoforge.com
              </a>. Messages are typically answered within 1 to 2 business days. If you are reporting
              a bug or a tracing problem, a screenshot and the photo you uploaded help a lot.
            </p>
            <p>
              For purchase issues (refund requests, missing credits, receipt problems), include the
              email address on your TracetoForge account and the approximate date of purchase so we
              can look up the transaction in RevenueCat.
            </p>
          </section>

          <section>
            <h2 className="text-xl md:text-2xl font-display font-bold text-white mb-3">What to expect</h2>
            <ul className="list-disc list-inside space-y-2 pl-2">
              <li><strong className="text-white">Typical response time:</strong> 1 to 2 business days</li>
              <li><strong className="text-white">Bug reports:</strong> fixes usually ship within a week, sometimes same day</li>
              <li><strong className="text-white">Feature requests:</strong> reviewed, prioritized against the roadmap, replied to honestly even if the answer is "not soon"</li>
              <li><strong className="text-white">Refund requests:</strong> processed per the{' '}
                <Link to="/terms/" className="text-brand underline hover:no-underline">Terms of Service</Link>
                {' '}refund policy (unspent credits refundable within 14 days)
              </li>
              <li><strong className="text-white">Partnership or press inquiries:</strong> also at the same email, with "press" or "partnership" in the subject</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl md:text-2xl font-display font-bold text-white mb-3">Contact form</h2>
            <p className="mb-6">
              This form opens your email app prefilled with your message. If your browser does not
              have a mail client configured, just email{' '}
              <a href="mailto:support@tracetoforge.com" className="text-brand underline hover:no-underline">
                support@tracetoforge.com
              </a>{' '}
              directly.
            </p>
            <div className="space-y-4 bg-surface/50 border border-surface-lighter/20 rounded-lg p-6">
              <div>
                <label htmlFor="contact-name" className="block text-sm font-mono text-[#8888A0] mb-2">Your name (optional)</label>
                <input
                  id="contact-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-bg border border-surface-lighter/30 rounded px-3 py-2 text-white focus:outline-none focus:border-brand"
                  placeholder="Jane Doe"
                />
              </div>
              <div>
                <label htmlFor="contact-subject" className="block text-sm font-mono text-[#8888A0] mb-2">Subject</label>
                <input
                  id="contact-subject"
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full bg-bg border border-surface-lighter/30 rounded px-3 py-2 text-white focus:outline-none focus:border-brand"
                  placeholder="Bug report, feature request, question..."
                />
              </div>
              <div>
                <label htmlFor="contact-message" className="block text-sm font-mono text-[#8888A0] mb-2">Message</label>
                <textarea
                  id="contact-message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={6}
                  className="w-full bg-bg border border-surface-lighter/30 rounded px-3 py-2 text-white focus:outline-none focus:border-brand"
                  placeholder="What is going on?"
                />
              </div>
              <button
                type="button"
                onClick={handleSend}
                disabled={!message.trim()}
                className="px-6 py-2 bg-brand text-black font-bold rounded hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
              >
                Open in email
              </button>
            </div>
          </section>

          <section>
            <h2 className="text-xl md:text-2xl font-display font-bold text-white mb-3">Business information</h2>
            <ul className="list-disc list-inside space-y-2 pl-2">
              <li><strong className="text-white">Operator:</strong> Qwikymart LLC</li>
              <li><strong className="text-white">Location:</strong> Northeast Ohio, United States</li>
              <li><strong className="text-white">Email:</strong>{' '}
                <a href="mailto:support@tracetoforge.com" className="text-brand underline hover:no-underline">
                  support@tracetoforge.com
                </a>
              </li>
              <li><strong className="text-white">Etsy:</strong>{' '}
                <a href="https://www.etsy.com/shop/TracetoForge" target="_blank" rel="noopener noreferrer" className="text-brand underline hover:no-underline">
                  etsy.com/shop/TracetoForge
                </a>
              </li>
              <li><strong className="text-white">Amazon:</strong>{' '}
                <a href="https://www.amazon.com/s?k=TracetoForge+gridfinity+insert&rh=n%3A553240" target="_blank" rel="noopener noreferrer" className="text-brand underline hover:no-underline">
                  TracetoForge on Amazon
                </a>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl md:text-2xl font-display font-bold text-white mb-3">Before you email: common questions</h2>
            <p className="mb-3">
              <strong className="text-white">"Auto-trace is missing part of my tool."</strong> Try
              increasing the Sensitivity slider. For shiny or chrome tools, tissue paper or a matte
              spray over the tool helps cut reflections. The{' '}
              <Link to="/guide/" className="text-brand underline hover:no-underline">Getting Started Guide</Link>{' '}
              has photo tips.
            </p>
            <p className="mb-3">
              <strong className="text-white">"I bought credits and they did not show up."</strong> Give
              it up to 60 seconds for the webhook to fire, then refresh the page. If credits are still
              missing after five minutes, email us with your order ID.
            </p>
            <p className="mb-3">
              <strong className="text-white">"The printed insert is too tight / too loose."</strong>{' '}
              Adjust the Tolerance slider in the editor. Most printers land well at 0.4 to 0.6 mm
              tolerance. Dial it in once on your printer and the same value works for every future
              insert.
            </p>
            <p>
              <strong className="text-white">"Can I get a refund?"</strong> Yes, unspent credits are
              refundable within 14 days of purchase. Email with the order ID and we will process it.
              See the full policy in the{' '}
              <Link to="/terms/" className="text-brand underline hover:no-underline">Terms of Service</Link>.
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
