"use client";

import { useState } from "react";
import { buildWhatsAppMessage, PRICE_PER_TUBE } from "@/lib/utils";

export function BookingForm({ form, setForm, editId, onSave, onCancel, saving }) {
  const [errors, setErrors] = useState({});

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = "Required";
    if (!form.phone.trim()) e.phone = "Required";
    else if (!/^\d{9,15}$/.test(form.phone.replace(/\s/g, "")))
      e.phone = "Enter a valid number with country code";
    if (!form.tubes || isNaN(form.tubes) || Number(form.tubes) <= 0)
      e.tubes = "Enter a valid number";
    if (!form.bookingDate) e.bookingDate = "Required";
    if (!form.location.trim()) e.location = "Required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const fields = [
    {
      key: "name",
      label: "Farmer Name",
      placeholder: "e.g. Uwimana Claudette",
      type: "text",
    },
    {
      key: "phone",
      label: "Telephone (with country code)",
      placeholder: "e.g. 250788123456",
      type: "tel",
    },
    {
      key: "tubes",
      label: "Tubes Booked",
      placeholder: "e.g. 500",
      type: "number",
    },
    {
      key: "bookingDate",
      label: "Booking Date",
      placeholder: "",
      type: "date",
    },
    {
      key: "inoculationDate",
      label: "Inoculation Date (Imigina yatewe umurama)",
      placeholder: "",
      type: "date",
    },
    {
      key: "location",
      label: "Farm Location",
      placeholder: "e.g. Musanze",
      type: "text",
    },
  ];

  const preview =
    form.name && form.tubes && form.bookingDate
      ? buildWhatsAppMessage({
          ...form,
          tubes: Number(form.tubes),
          inoculationDate: form.inoculationDate || form.bookingDate,
        })
      : null;

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 22, fontWeight: "bold", color: "#c8e6c9" }}>
          {editId ? "Edit Booking" : "New Booking"}
        </div>
        <div style={{ fontSize: 13, color: "#6a9c6a", marginTop: 4 }}>
          {editId
            ? "Update the details below."
            : "Fill in the farmer's details."}
        </div>
      </div>
      <div
        style={{
          background: "#1a2e1a",
          border: "1px solid #2d4a2d",
          borderRadius: 14,
          padding: 20,
        }}
      >
        {fields.map((field) => (
          <div key={field.key} style={{ marginBottom: 16 }}>
            <label
              style={{
                display: "block",
                fontSize: 12,
                color: "#9ab89a",
                marginBottom: 6,
                textTransform: "uppercase",
                letterSpacing: 0.8,
              }}
            >
              {field.label}
            </label>
            <input
              type={field.type}
              placeholder={field.placeholder}
              value={form[field.key] ?? ""}
              onChange={(e) => {
                setForm({ ...form, [field.key]: e.target.value });
                setErrors({ ...errors, [field.key]: null });
              }}
              style={{
                width: "100%",
                padding: "13px 14px",
                borderRadius: 10,
                border: `1px solid ${
                  errors[field.key] ? "#dc2626" : "#2d4a2d"
                }`,
                background: "#0f1a0f",
                color: "#e8dcc8",
                fontSize: 15,
                fontFamily: "Georgia, serif",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
            {field.key === "inoculationDate" && (
              <div style={{ fontSize: 11, color: "#6a9c6a", marginTop: 4 }}>
                Delivery is due 30 days after this date. Leave blank to use
                the booking date.
              </div>
            )}
            {errors[field.key] && (
              <div style={{ color: "#f87171", fontSize: 12, marginTop: 4 }}>
                ⚠ {errors[field.key]}
              </div>
            )}
          </div>
        ))}
        {form.tubes && Number(form.tubes) > 0 && (
          <div
            style={{
              background: "#0a140a",
              borderRadius: 10,
              padding: "10px 14px",
              marginBottom: 16,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span style={{ fontSize: 13, color: "#6a9c6a" }}>
              Amount to pay
            </span>
            <span
              style={{ fontSize: 16, fontWeight: "bold", color: "#4ade80" }}
            >
              RWF {(Number(form.tubes) * PRICE_PER_TUBE).toLocaleString()}
            </span>
          </div>
        )}
        {preview && (
          <div
            style={{
              background: "#0a140a",
              border: "1px solid #2d4a2d",
              borderRadius: 10,
              padding: 14,
              marginBottom: 18,
            }}
          >
            <div
              style={{
                fontSize: 11,
                color: "#4a7c59",
                letterSpacing: 1,
                textTransform: "uppercase",
                marginBottom: 8,
              }}
            >
              💬 Message Preview
            </div>
            <div
              style={{
                fontSize: 13,
                color: "#9ab89a",
                whiteSpace: "pre-line",
                lineHeight: 1.8,
              }}
            >
              {preview}
            </div>
          </div>
        )}
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={() => {
              if (validate()) onSave(form);
            }}
            disabled={saving}
            style={{
              flex: 1,
              padding: 14,
              borderRadius: 10,
              border: "none",
              background: saving ? "#2d4a2d" : "#4a7c59",
              color: "white",
              fontSize: 15,
              fontWeight: "bold",
              cursor: saving ? "not-allowed" : "pointer",
              fontFamily: "Georgia, serif",
              transition: "background 0.2s",
            }}
          >
            {saving ? "Saving..." : editId ? "Update Booking" : "Save Booking"}
          </button>
          <button
            onClick={onCancel}
            disabled={saving}
            style={{
              padding: "14px 18px",
              borderRadius: 10,
              border: "1px solid #2d4a2d",
              background: "transparent",
              color: "#9ab89a",
              fontSize: 15,
              cursor: "pointer",
              fontFamily: "Georgia, serif",
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
