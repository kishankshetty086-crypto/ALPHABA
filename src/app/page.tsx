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

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch("/api/availability");

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
      
      // Map result.records from Zoho to our expected format
      if (result && result.records) {
        const parsed = result.records.map((r: any) => ({
          name: r["BA NAME"] || r.name,
          availability: r["AVAILABILITY"] || r.availability,
          contact: r["CONTACT NUMBER"] || r.contact
        }));
        setData(parsed);
      } else {
        // Fallback gracefully on invalid format
        setError("Invalid data format received from Zoho. Displaying fallback sample data.");
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
    if (lower.includes('available')) return 'status-available';
    if (lower.includes('escalation')) return 'status-escalation';
    return 'status-unavailable';
  };

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
                  {data.length === 0 ? (
                    <tr>
                      <td colSpan={3} className={styles.emptyState}>No data available</td>
                    </tr>
                  ) : (
                    data.map((item, index) => (
                      <tr key={index} className={styles.tableRow}>
                        <td className={styles.nameCell}>
                          <div className={styles.avatar}>{item.name.substring(0, 2)}</div>
                          {item.name}
                        </td>
                        <td>
                          <span className={`${styles.statusBadge} ${styles[getStatusColor(item.availability)]}`}>
                            <span className={styles.statusDot}></span>
                            {item.availability}
                          </span>
                        </td>
                        <td className={styles.contactCell}>{item.contact}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
