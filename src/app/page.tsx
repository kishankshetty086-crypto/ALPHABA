"use client";

import { useEffect, useState } from "react";
import styles from "./page.module.css";

interface AvailabilityRecord {
  name: string;
  availability: string;
  contact: string;
}

export default function AvailabilityPage() {
  const [data, setData] = useState<AvailabilityRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Chat Feature State
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatForm, setChatForm] = useState({ clientName: '', contactDetails: '', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [chatStatus, setChatStatus] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatForm.clientName || !chatForm.contactDetails || !chatForm.message) return;

    setIsSubmitting(true);
    setChatStatus(null);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(chatForm)
      });

      if (res.ok) {
        setChatStatus({ type: 'success', text: 'Message sent successfully!' });
        setChatForm({ clientName: '', contactDetails: '', message: '' });
        setTimeout(() => {
          setIsChatOpen(false);
          setChatStatus(null);
        }, 2000);
      } else {
        setChatStatus({ type: 'error', text: 'Failed to send message.' });
      }
    } catch (err) {
      setChatStatus({ type: 'error', text: 'Network error occurred.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Poll for updates every 30 seconds
    const interval = setInterval(() => {
      fetchData(false); // Pass false to not show full loading spinner on every background refresh
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const fetchData = async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true);
      setError(null);

      // cache: 'no-store' forces the browser not to cache the request
      const response = await fetch("/api/availability?t=" + new Date().getTime(), {
        cache: "no-store"
      });

      if (!response.ok) {
        // Fallback to sample data gracefully without throwing an unhandled error
        setError("Unable to connect to live Zoho Sheet (Check configuration). Displaying fallback sample data.");
        setData([
          { name: "BA 1", availability: "AVAILABLE", contact: "7319564277" },
          { name: "BA 2", availability: "AVAILABLE", contact: "7319545111" },
          { name: "BA 3", availability: "Escalation Support", contact: "7319545111" }
        ]);
        setLoading(false);
        return;
      }

      const result = await response.json();

      // Map result from Zoho to our expected format
      if (result && result.records) {
        // Handle array of objects format (worksheet.records.fetch)
        const parsed = result.records.map((r: any) => ({
          name: r["BA NAME"] || r.name,
          availability: r["AVAILABILITY"] || r.availability,
          contact: r["CONTACT NUMBER"] || r.contact
        }));
        setData(parsed);
      } else if (result && result.range_details && Array.isArray(result.range_details)) {
        // Handle 2D array format (worksheet.content.get)
        const dataRows = result.range_details.filter((row: any) => row.row_index > 1); // skip header row 1

        if (dataRows.length > 0) {
          const parsed = dataRows.map((row: any) => {
            const getCol = (idx: number) => {
              const col = row.row_details?.find((c: any) => c.column_index === idx);
              return col ? col.content : "Unknown";
            };
            return {
              name: getCol(1),
              availability: getCol(2),
              contact: getCol(3)
            };
          });
          setData(parsed);
        } else {
          setData([]);
        }
      } else {
        // Fallback gracefully on invalid format
        const keys = result ? Object.keys(result).join(", ") : "null";
        console.log("Raw Zoho Data:", result);
        setError(`Invalid data format. Keys found: ${keys}. Data: ${JSON.stringify(result).substring(0, 150)}`);
        setData([
          { name: "BA 1", availability: "AVAILABLE", contact: "7319564277" },
          { name: "BA 2", availability: "AVAILABLE", contact: "7319545111" },
          { name: "BA 3", availability: "Escalation Support", contact: "7319545111" }
        ]);
      }
    } catch (err: any) {
      console.warn("Fetch Error caught:", err);
      // Fallback data for network errors
      setError("Unable to connect to live Zoho Sheet (Check configuration). Displaying fallback sample data.");
      setData([
        { name: "BA 1", availability: "AVAILABLE", contact: "7319564277" },
        { name: "BA 2", availability: "AVAILABLE", contact: "7319545111" },
        { name: "BA 3", availability: "Escalation Support", contact: "7319545111" }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const lower = status.toLowerCase();
    if (lower.includes('not available') || lower.includes('unavailable')) return 'status-unavailable';
    if (lower.includes('available')) return 'status-available';
    if (lower.includes('escalation')) return 'status-escalation';
    return 'status-unavailable';
  };

  const sortedData = [...data].sort((a, b) => {
    const getPriority = (status: string) => {
      const lower = (status || "").toLowerCase();
      if (lower.includes('not available') || lower.includes('unavailable')) return 3;
      if (lower.includes('available')) return 1;
      if (lower.includes('escalation')) return 2;
      return 4;
    };

    const pA = getPriority(a.availability);
    const pB = getPriority(b.availability);

    if (pA !== pB) return pA - pB;
    return (a.name || "").localeCompare(b.name || "");
  });

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <h1 className={styles.title}>Support Availability</h1>
          <p className={styles.subtitle}>Real-time availability of our support team</p>
        </div>
      </header>

      <main className={styles.main}>
        {loading ? (
          <div className={styles.loaderContainer}>
            <div className={styles.spinner}></div>
            <p>Loading availability data...</p>
          </div>
        ) : (
          <>
            {error && (
              <div className={styles.errorBanner}>
                {error}
              </div>
            )}

            <div className={styles.tableContainer}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>BA Name</th>
                    <th>Availability</th>
                    <th>Contact Number</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedData.length === 0 ? (
                    <tr>
                      <td colSpan={3} className={styles.emptyState}>No data available</td>
                    </tr>
                  ) : (
                    sortedData.map((item, index) => (
                      <tr key={index} className={styles.tableRow}>
                        <td className={styles.nameCell}>
                          <div className={styles.avatar}>{(item.name || "??").substring(0, 2)}</div>
                          {item.name || "Unknown"}
                        </td>
                        <td>
                          <span className={`${styles.statusBadge} ${styles[getStatusColor(item.availability)]}`}>
                            <span className={styles.statusDot}></span>
                            {item.availability}
                          </span>
                        </td>
                        <td className={styles.contactCell}>
                          <a href={`tel:${item.contact}`} className={styles.contactLinkDesktop}>
                            {item.contact}
                          </a>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Card Grid */}
            <div className={styles.cardGrid}>
              {sortedData.length === 0 ? (
                <div className={styles.emptyState}>No data available</div>
              ) : (
                sortedData.map((item, index) => (
                  <div
                    key={index}
                    className={styles.mobileCard}
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <div className={styles.cardHeader}>
                      <div className={styles.avatar}>{(item.name || "??").substring(0, 2)}</div>
                      <div className={styles.cardName}>{item.name || "Unknown"}</div>
                    </div>

                    <div className={styles.cardBody}>
                      <span className={`${styles.statusBadge} ${styles[getStatusColor(item.availability)]}`}>
                        <span className={styles.statusDot}></span>
                        {item.availability}
                      </span>
                    </div>

                    <div className={styles.cardFooter}>
                      <a href={`tel:${item.contact}`} className={styles.contactLink}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                        </svg>
                        {item.contact}
                      </a>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </main>

      {/* Floating Chat Button */}
      <button
        className={styles.chatButton}
        onClick={() => setIsChatOpen(true)}
        aria-label="Open Chat"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
      </button>

      {/* Chat Modal */}
      {isChatOpen && (
        <div className={styles.modalOverlay} onClick={(e) => { if (e.target === e.currentTarget) setIsChatOpen(false); }}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h2>Send Alert</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.5rem' }}>Notify the support team about a client issue</p>
              <button className={styles.closeButton} onClick={() => setIsChatOpen(false)} aria-label="Close modal">&times;</button>
            </div>

            <form onSubmit={handleChatSubmit}>
              <div className={styles.formGroup}>
                <label htmlFor="clientName">Client Name *</label>
                <input
                  type="text"
                  id="clientName"
                  className={styles.inputField}
                  value={chatForm.clientName}
                  onChange={(e) => setChatForm({ ...chatForm, clientName: e.target.value })}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="contactDetails">Contact Details *</label>
                <input
                  type="text"
                  id="contactDetails"
                  className={styles.inputField}
                  value={chatForm.contactDetails}
                  onChange={(e) => setChatForm({ ...chatForm, contactDetails: e.target.value })}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="message">Message *</label>
                <textarea
                  id="message"
                  className={styles.inputField}
                  style={{ minHeight: '100px', resize: 'vertical' }}
                  value={chatForm.message}
                  onChange={(e) => setChatForm({ ...chatForm, message: e.target.value })}
                  required
                />
              </div>

              {chatStatus && (
                <div className={`${styles.chatMessage} ${chatStatus.type === 'success' ? styles.chatSuccess : styles.chatError}`}>
                  {chatStatus.text}
                </div>
              )}

              <button
                type="submit"
                className={styles.submitButton}
                disabled={isSubmitting || !chatForm.clientName || !chatForm.contactDetails || !chatForm.message}
              >
                {isSubmitting ? 'Sending...' : 'Send Alert'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
