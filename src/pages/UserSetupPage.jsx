import React from "react";
import "./UserSetupPage.css";

export default function UserSetupPage({ user }) {
  return (
    <div className="setup-page">
      <h1>User Setup</h1>
      <p>Welcome, {user?.email || "unknown user"}!</p>

      <form className="setup-form">
        <label>
          Nickname (optional):
          <input type="text" name="nickname" placeholder="Enter your nickname" />
        </label>

        <label>
          Email Address:
          <input type="email" value={user?.email} disabled />
        </label>

        <button type="submit">Finish Setup</button>
      </form>
    </div>
  );
}

