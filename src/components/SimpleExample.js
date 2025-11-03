import React, { useState } from 'react';
import styles from './SimpleExample.module.css';

export default function SimpleExample() {
  const [count, setCount] = useState(0);
  const [name, setName] = useState('');

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>Simple React Example v2</h1>
        <p className={styles.description}>
          This is a minimal React component example for testing deployment to LWC.
        </p>

        <div className={styles.section}>
          <h2 className={styles.subtitle}>Counter Example</h2>
          <div className={styles.counter}>
            <button 
              className={styles.button}
              onClick={() => setCount(count - 1)}
            >
              -
            </button>
            <span className={styles.count}>{count}</span>
            <button 
              className={styles.button}
              onClick={() => setCount(count + 1)}
            >
              +
            </button>
          </div>
          <button 
            className={styles.resetButton}
            onClick={() => setCount(0)}
          >
            Reset
          </button>
        </div>

        <div className={styles.section}>
          <h2 className={styles.subtitle}>Input Example</h2>
          <input
            type="text"
            className={styles.input}
            placeholder="Enter your name..."
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          {name && (
            <p className={styles.greeting}>
              Hello, <strong>{name}</strong>!
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

