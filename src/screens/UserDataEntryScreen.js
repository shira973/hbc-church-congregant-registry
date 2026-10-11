import React, { useState, useEffect } from "react";
import { View, ScrollView, StyleSheet, Platform } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import {
  Text,
  TextInput,
  Button,
  SegmentedButtons,
  HelperText,
  Menu,
  RadioButton,
  Switch,
} from "react-native-paper";
import { useRoute } from "@react-navigation/native";
import { useAuth } from "../context/AuthContext";
import { createMember, updateMember, getMember, DEFAULT_MEMBER } from "../utils/firestoreHelpers";
import { LANGUAGES, LANGUAGE_LABELS, label } from "../i18n/translations";

// One entry per plain text field: [fieldKey, formStatePath]. Address and
// admin-only fields are handled separately below since they need special
// layout/visibility.
const BASIC_FIELDS = [
  ["name", "name"],
  ["dob", "dob"],
  ["phone", "phone"],
  ["fatherName", "fatherName"],
  ["motherName", "motherName"],
  ["baptismDate", "baptismDate"],
  ["baptizedBy", "baptizedBy"],
  ["previousConvention", "previousConvention"],
  ["transitingToConvention", "transitingToConvention"],
  ["dateOfDiscontinuation", "dateOfDiscontinuation"],
  ["dateOfReborn", "dateOfReborn"],
  ["dateOfRejoin", "dateOfRejoin"],
];

const PERMANENT_ADDRESS_FIELDS = [
  ["state", "state"],
  ["district", "district"],
  ["townCityVillage", "townCityVillage"],
  ["locality", "locality"],
  ["houseNumber", "houseNumber"],
  ["houseName", "houseName"],
  ["pinCode", "pinCode"],
];

const MEGHALAYA_DISTRICTS = [
  "East Garo Hills",
  "North Garo Hills",
  "South Garo Hills",
  "West Garo Hills",
  "South West Garo Hills",
  "East Khasi Hills",
  "West Jaintia Hills",
  "East Jaintia Hills",
  "South West Khasi Hills",
  "West Khasi Hills",
  "Eastern West Khasi Hills",
  "Ri Bhoi",
];

const DATE_FIELDS = new Set([
  "dob",
  "baptismDate",
  "dateOfDiscontinuation",
  "dateOfReborn",
  "dateOfRejoin",
]);

const BAPTIZED_BY_OPTIONS = [
  "Pastor Senggrang P Marak",
  "Pastor EP R Marak",
];

const FIELD_PLACEHOLDERS = {
  name: "Hannah",
  phone: "999999999",
  fatherName: "Samuel",
  motherName: "Lucy",
  dob: "YYYY-MM-DD",
  baptismDate: "YYYY-MM-DD",
  dateOfDiscontinuation: "YYYY-MM-DD",
  dateOfReborn: "YYYY-MM-DD",
  dateOfRejoin: "YYYY-MM-DD",
  baptizedBy: "Select a pastor",
  previousConvention: "North Garo Baptist Convention",
  transitingToConvention: "Tura Convention",
  state: "Meghalaya",
  townCityVillage: "Tura",
  district: "West Garo Hills",
  locality: "Chibinang",
  houseNumber: "12",
  houseName: "Sunrise Home",
  pinCode: "123456",
  temporaryAddress: "Near market road",
  guardianCaretaker: "S. Marak",
  dateOfDeath: "YYYY-MM-DD",
};

function emptyForm() {
  return JSON.parse(JSON.stringify(DEFAULT_MEMBER));
}

function formatDateForStorage(date) {
  if (!date) return "";

  const jsDate = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(jsDate.getTime())) return "";

  const year = jsDate.getFullYear();
  const month = String(jsDate.getMonth() + 1).padStart(2, "0");
  const day = String(jsDate.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function parseDateValue(value) {
  if (!value) return new Date();

  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return new Date();

  return new Date(year, month - 1, day);
}

export default function UserDataEntryScreen() {
  const { admin } = useAuth(); // null when a congregant fills this in unauthenticated
  const route = useRoute();
  const memberId = route.params?.memberId;
  const inputTheme = {
    colors: {
      text: "#000000",
      primary: "#1d6fb8",
      placeholder: "#000000",
      onSurfaceVariant: "#000000",
      background: "#cfe0f3",
    },
  };

  const [lang, setLang] = useState(LANGUAGES[0]);
  const [form, setForm] = useState(emptyForm());
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [datePickerField, setDatePickerField] = useState(null);
  const [baptizedByMenuVisible, setBaptizedByMenuVisible] = useState(false);
  const [addressMenuField, setAddressMenuField] = useState("");
  const [pinError, setPinError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const isWeb = Platform.OS === "web";
  const placeholderColor = "#6b7280";

  useEffect(() => {
    if (isWeb) {
      require("bootstrap/dist/css/bootstrap.min.css");
    }
  }, [isWeb]);

  useEffect(() => {
    if (!memberId) {
      setForm(emptyForm());
      return;
    }
    (async () => {
      const existing = await getMember(memberId);
      if (existing) setForm({ ...emptyForm(), ...existing });
    })();
  }, [memberId]);

  const setField = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
    setFieldErrors((errors) => {
      const next = { ...errors, [key]: "" };
      if (["fatherName", "motherName"].includes(key)) next.parentNames = "";
      return next;
    });
  };
  const setAddressField = (key, value) => {
    setForm((f) => ({
      ...f,
      address: {
        ...f.address,
        permanent: { ...f.address.permanent, [key]: value },
      },
    }));
    setFieldErrors((errors) => ({ ...errors, permanentAddress: "" }));
  };
  const setTemporaryAddress = (value) => {
    setForm((f) => ({ ...f, address: { ...f.address, temporary: value } }));
    setFieldErrors((errors) => ({ ...errors, permanentAddress: "" }));
  };
  const setGuardianCaretaker = (value) => {
    setForm((f) => ({ ...f, address: { ...f.address, guardianCaretaker: value } }));
    setFieldErrors((errors) => ({ ...errors, parentNames: "" }));
  };
  const handlePhoneChange = (value) => {
    setField("phone", value.replace(/\D/g, "").slice(0, 10));
  };

  const handleSave = async () => {
    const errors = {};
    if (!form.name.trim()) errors.name = "Name is required.";
    if (!form.sex.trim()) errors.sex = "Sex is required.";
    if (!form.dob.trim()) errors.dob = "Date of birth is required.";
    if (form.phone && !/^\d{10}$/.test(form.phone)) {
      errors.phone = "Enter exactly 10 digits, or leave this optional field blank.";
    }

    const hasBothParentNames = form.fatherName.trim() && form.motherName.trim();
    const hasGuardian = form.address.guardianCaretaker.trim();
    if (!hasBothParentNames && !hasGuardian) {
      errors.parentNames = "Enter both parent names, or provide a guardian/caretaker.";
    }

    const hasPermanentAddress = Object.values(form.address.permanent).some((value) =>
      String(value || "").trim()
    );
    if (!hasPermanentAddress && !form.address.temporary.trim()) {
      errors.permanentAddress = "Enter a permanent address or a temporary address.";
    }

    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      setStatus("Please correct the fields marked in red.");
      return;
    }

    const pinValue = form.address.permanent.pinCode || "";
    if (pinValue && !/^\d{6}$/.test(pinValue)) {
      setPinError("PIN can only contain numbers and must be exactly 6 digits.");
      return;
    }

    setBusy(true);
    setStatus("");
    try {
      // Admin-only fields are stripped out entirely when a non-admin
      // (congregant, self-service) submits, regardless of what's in
      // local state — this mirrors the Firestore rule that also blocks it.
      const payload = { ...form };
      if (!admin) {
        payload.dateOfDeath = "";
        payload.remarks = "";
        payload.isAdmin = false;
        payload.position = "Congregant";
      }

      if (memberId) {
        await updateMember(memberId, payload);
        setStatus("Saved changes.");
      } else {
        await createMember(payload);
        setStatus("Entry submitted. Thank you.");
        setForm(emptyForm());
      }
    } catch (e) {
      setStatus(`Error: ${e.message}`);
    } finally {
      setBusy(false);
    }
  };

  const openDatePicker = (formKey) => {
    if (isWeb) return;
    setDatePickerField(formKey);
  };

  const renderTextField = ({
    labelKey,
    formKey,
    value,
    onChangeText,
    keyboardType = "default",
    multiline = false,
    maxLength,
    right,
    editable = true,
    placeholder,
  }) => {
    const validationError = fieldErrors[formKey] ||
      (["fatherName", "motherName"].includes(formKey) ? fieldErrors.parentNames : "");
    return (
      <View key={formKey} style={styles.fieldBlock}>
        <Text style={styles.fieldLabel}>{label(labelKey, lang)}</Text>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          mode="outlined"
          style={styles.input}
          contentStyle={styles.inputText}
          labelStyle={styles.inputLabel}
          textColor="#000000"
          placeholderTextColor={placeholderColor}
          placeholder={placeholder || FIELD_PLACEHOLDERS[formKey] || ""}
          theme={inputTheme}
          keyboardType={keyboardType}
          multiline={multiline}
          maxLength={maxLength}
          editable={editable}
          right={right}
          error={!!validationError}
        />
        {!!validationError && <HelperText type="error">{validationError}</HelperText>}
      </View>
    );
  };

  const renderDateField = (labelKey, formKey) => {
    if (isWeb) {
      return (
        <View key={formKey} style={styles.webDatePickerBlock}>
          <Text style={styles.fieldLabel}>{label(labelKey, lang)}</Text>
          <DatePicker
            selected={form[formKey] ? parseDateValue(form[formKey]) : null}
            onChange={(date) => {
              if (date) {
                setField(formKey, formatDateForStorage(date));
              }
            }}
            dateFormat="yyyy-MM-dd"
            isClearable
            placeholderText={FIELD_PLACEHOLDERS[formKey] || "YYYY-MM-DD"}
            className="web-date-picker-input"
            wrapperClassName="web-date-picker-wrapper"
            showMonthDropdown
            showYearDropdown
            dropdownMode="select"
            popperPlacement="bottom-start"
          />
        </View>
      );
    }

    return (
      <View key={formKey} style={styles.fieldBlock}>
        <Text style={styles.fieldLabel}>{label(labelKey, lang)}</Text>
        <TextInput
          value={form[formKey]}
          onPressIn={() => openDatePicker(formKey)}
          mode="outlined"
          style={styles.input}
          contentStyle={styles.inputText}
          labelStyle={styles.inputLabel}
          textColor="#000000"
          placeholderTextColor={placeholderColor}
          placeholder={FIELD_PLACEHOLDERS[formKey] || "YYYY-MM-DD"}
          theme={inputTheme}
          error={!!fieldErrors[formKey]}
          editable={false}
          showSoftInputOnFocus={false}
          right={
            <TextInput.Icon
              icon="calendar"
              size={22}
              onPress={() => openDatePicker(formKey)}
              forceTextInputFocus={false}
            />
          }
        />
        {!!fieldErrors[formKey] && <HelperText type="error">{fieldErrors[formKey]}</HelperText>}

        {datePickerField === formKey && (
          <View style={styles.datePickerWrapper}>
            <DateTimePicker
              value={parseDateValue(form[formKey])}
              mode="date"
              display="default"
              onChange={(event, selectedDate) => {
                setDatePickerField(null);
                if (selectedDate) {
                  setField(formKey, formatDateForStorage(selectedDate));
                }
              }}
            />
          </View>
        )}
      </View>
    );
  };

  const renderBaptizedByField = () => (
    <View key="baptizedBy" style={styles.fieldBlock}>
      <Text style={styles.fieldLabel}>{label("baptizedBy", lang)}</Text>
      <Menu
        visible={baptizedByMenuVisible}
        onDismiss={() => setBaptizedByMenuVisible(false)}
        contentStyle={styles.baptizedByMenu}
        anchor={
          <TextInput
            value={form.baptizedBy}
            mode="outlined"
            style={styles.input}
            contentStyle={styles.inputText}
            labelStyle={styles.inputLabel}
            textColor="#000000"
            placeholderTextColor={placeholderColor}
            placeholder={FIELD_PLACEHOLDERS.baptizedBy}
            theme={inputTheme}
            editable={false}
            right={
              <TextInput.Icon
                icon="menu-down"
                size={22}
                onPress={() => setBaptizedByMenuVisible((value) => !value)}
                forceTextInputFocus={false}
              />
            }
          />
        }
      >
        {BAPTIZED_BY_OPTIONS.map((option) => (
          <Menu.Item
            key={option}
            onPress={() => {
              setField("baptizedBy", option);
              setBaptizedByMenuVisible(false);
            }}
            title={option}
            titleStyle={styles.menuItemText}
          />
        ))}
      </Menu>
    </View>
  );

  const renderPermanentAddressField = (labelKey, addrKey) => {
    if (addrKey === "state") {
      const stateValue = form.address.permanent.state;
      const stateChoice = stateValue === "Meghalaya" ? "Meghalaya" : stateValue ? "Others" : "";
      const otherState = stateValue && stateValue !== "Meghalaya" && stateValue !== "Others"
        ? stateValue
        : "";

      return (
        <View key={addrKey} style={styles.fieldBlock}>
          <Text style={styles.fieldLabel}>{label(labelKey, lang)}</Text>
          <Menu
            visible={addressMenuField === "state"}
            onDismiss={() => setAddressMenuField("")}
            anchor={
              <TextInput
                value={stateChoice}
                mode="outlined"
                style={styles.input}
                contentStyle={styles.inputText}
                textColor="#000000"
                placeholder="Select a state"
                theme={inputTheme}
                editable={false}
                right={<TextInput.Icon icon="menu-down" onPress={() => setAddressMenuField("state")} />}
              />
            }
          >
            {["Meghalaya", "Others"].map((option) => (
              <Menu.Item
                key={option}
                title={option}
                onPress={() => {
                  setAddressField("state", option);
                  setAddressMenuField("");
                }}
              />
            ))}
          </Menu>
          {stateChoice === "Others" && (
            <TextInput
              value={otherState}
              onChangeText={(value) => setAddressField("state", value || "Others")}
              mode="outlined"
              style={styles.input}
              contentStyle={styles.inputText}
              textColor="#000000"
              placeholder="Enter state"
              theme={inputTheme}
            />
          )}
        </View>
      );
    }

    if (addrKey === "district" && form.address.permanent.state === "Meghalaya") {
      const districtValue = form.address.permanent.district;
      const districtChoice = MEGHALAYA_DISTRICTS.includes(districtValue)
        ? districtValue
        : districtValue ? "Others" : "";
      const otherDistrict = districtValue && districtValue !== "Others" && !MEGHALAYA_DISTRICTS.includes(districtValue)
        ? districtValue
        : "";
      const districtOptions = [...MEGHALAYA_DISTRICTS, "Others"];

      return (
        <View key={addrKey} style={styles.fieldBlock}>
          <Text style={styles.fieldLabel}>{label(labelKey, lang)}</Text>
          <Menu
            visible={addressMenuField === "district"}
            onDismiss={() => setAddressMenuField("")}
            anchor={
              <TextInput
                value={districtChoice}
                mode="outlined"
                style={styles.input}
                contentStyle={styles.inputText}
                textColor="#000000"
                placeholder="Select a district"
                theme={inputTheme}
                editable={false}
                right={<TextInput.Icon icon="menu-down" onPress={() => setAddressMenuField("district")} />}
              />
            }
          >
            {districtOptions.map((option) => (
              <Menu.Item
                key={option}
                title={option}
                onPress={() => {
                  setAddressField("district", option);
                  setAddressMenuField("");
                }}
              />
            ))}
          </Menu>
          {districtChoice === "Others" && (
            <TextInput
              value={otherDistrict}
              onChangeText={(value) => setAddressField("district", value || "Others")}
              mode="outlined"
              style={styles.input}
              contentStyle={styles.inputText}
              textColor="#000000"
              placeholder="Enter district"
              theme={inputTheme}
            />
          )}
        </View>
      );
    }

    if (addrKey === "pinCode") {
      return (
        <View key={addrKey} style={styles.fieldBlock}>
          <Text style={styles.fieldLabel}>{label(labelKey, lang)}</Text>
          <TextInput
            value={form.address.permanent[addrKey]}
            onChangeText={(value) => {
              if (/^\d{0,6}$/.test(value)) {
                setAddressField(addrKey, value);
                setPinError("");
                return;
              }

              setPinError("PIN can only contain numbers.");
            }}
            mode="outlined"
            style={styles.input}
            contentStyle={styles.inputText}
            labelStyle={styles.inputLabel}
            textColor="#000000"
            placeholderTextColor={placeholderColor}
            placeholder={FIELD_PLACEHOLDERS[addrKey] || ""}
            theme={inputTheme}
            keyboardType="numeric"
            maxLength={6}
          />
          <HelperText type="error" visible={!!pinError} style={styles.errorText}>
            {pinError}
          </HelperText>
        </View>
      );
    }

    return (
      <View key={addrKey} style={styles.fieldBlock}>
        <Text style={styles.fieldLabel}>{label(labelKey, lang)}</Text>
        <TextInput
          value={form.address.permanent[addrKey]}
          onChangeText={(v) => setAddressField(addrKey, v)}
          mode="outlined"
          style={styles.input}
          contentStyle={styles.inputText}
          labelStyle={styles.inputLabel}
          textColor="#000000"
          placeholderTextColor={placeholderColor}
          placeholder={FIELD_PLACEHOLDERS[addrKey] || ""}
          theme={inputTheme}
        />
      </View>
    );
  };

  const renderBootstrapPreview = () => (
    <div className="container-fluid px-3 py-4" style={{ backgroundColor: "#eef3f8", minHeight: "100vh", overflowY: "auto", overflowX: "hidden" }}>
      <div className="container pb-5">
        <div className="row align-items-center mb-4">
          <div className="col-md-8">
            <h2 className="mb-0 fw-bold text-primary">{label("formTitle", lang)}</h2>
          </div>
          <div className="col-md-4 d-flex justify-content-md-end">
            <div className="btn-group" role="group" aria-label="Language selector">
              {LANGUAGES.map((language) => (
                <button
                  key={language}
                  type="button"
                  className={`btn ${lang === language ? "btn-primary" : "btn-outline-primary"}`}
                  onClick={() => setLang(language)}
                >
                  {LANGUAGE_LABELS[language]}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="card shadow-sm border-0">
          <div className="card-body p-4 p-md-5">
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label fw-semibold">{label("name", lang)}</label>
                <input className={`form-control ${fieldErrors.name ? "is-invalid" : ""}`} value={form.name} onChange={(e) => setField("name", e.target.value)} placeholder={FIELD_PLACEHOLDERS.name} />
                {fieldErrors.name && <div className="invalid-feedback">{fieldErrors.name}</div>}
              </div>
              <div className="col-md-6">
                <label className="form-label fw-semibold">{label("sex", lang)}</label>
                <select className={`form-select ${fieldErrors.sex ? "is-invalid" : ""}`} value={form.sex} onChange={(e) => setField("sex", e.target.value)}>
                  <option value="">Select sex</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
                {fieldErrors.sex && <div className="invalid-feedback">{fieldErrors.sex}</div>}
              </div>

              <div className="col-md-6">
                <label className="form-label fw-semibold">{label("dob", lang)}</label>
                <input
                  type="date"
                  className={`form-control ${fieldErrors.dob ? "is-invalid" : ""}`}
                  value={form.dob}
                  onChange={(e) => setField("dob", e.target.value)}
                />
                {fieldErrors.dob && <div className="invalid-feedback">{fieldErrors.dob}</div>}
              </div>

              <div className="col-md-6">
                <label className="form-label fw-semibold">{label("phone", lang)}</label>
                <input className={`form-control ${fieldErrors.phone ? "is-invalid" : ""}`} value={form.phone} onChange={(e) => handlePhoneChange(e.target.value)} placeholder={FIELD_PLACEHOLDERS.phone} inputMode="numeric" maxLength={10} />
                {fieldErrors.phone && <div className="invalid-feedback">{fieldErrors.phone}</div>}
              </div>
              <div className="col-md-6">
                <label className="form-label fw-semibold">{label("fatherName", lang)}</label>
                <input className={`form-control ${fieldErrors.parentNames ? "is-invalid" : ""}`} value={form.fatherName} onChange={(e) => setField("fatherName", e.target.value)} placeholder={FIELD_PLACEHOLDERS.fatherName} />
                {fieldErrors.parentNames && <div className="invalid-feedback d-block">{fieldErrors.parentNames}</div>}
              </div>

              <div className="col-md-6">
                <label className="form-label fw-semibold">{label("motherName", lang)}</label>
                <input className={`form-control ${fieldErrors.parentNames ? "is-invalid" : ""}`} value={form.motherName} onChange={(e) => setField("motherName", e.target.value)} placeholder={FIELD_PLACEHOLDERS.motherName} />
                {fieldErrors.parentNames && <div className="invalid-feedback d-block">{fieldErrors.parentNames}</div>}
              </div>
              <div className="col-md-6">
                <label className="form-label fw-semibold">{label("baptismDate", lang)}</label>
                <input
                  type="date"
                  className="form-control"
                  value={form.baptismDate}
                  onChange={(e) => setField("baptismDate", e.target.value)}
                />
              </div>
              <div className="col-md-6">
                <label className="form-label fw-semibold">{label("baptizedBy", lang)}</label>
                <select className="form-select" value={form.baptizedBy} onChange={(e) => setField("baptizedBy", e.target.value)}>
                  <option value="">{FIELD_PLACEHOLDERS.baptizedBy}</option>
                  {BAPTIZED_BY_OPTIONS.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>

              <div className="col-md-6">
                <label className="form-label fw-semibold">{label("previousConvention", lang)}</label>
                <input className="form-control" value={form.previousConvention} onChange={(e) => setField("previousConvention", e.target.value)} placeholder={FIELD_PLACEHOLDERS.previousConvention} />
              </div>
              <div className="col-md-6">
                <label className="form-label fw-semibold">{label("transitingToConvention", lang)}</label>
                <input className="form-control" value={form.transitingToConvention} onChange={(e) => setField("transitingToConvention", e.target.value)} placeholder={FIELD_PLACEHOLDERS.transitingToConvention} />
              </div>

              <div className="col-md-6">
                <label className="form-label fw-semibold">{label("dateOfDiscontinuation", lang)}</label>
                <input
                  type="date"
                  className="form-control"
                  value={form.dateOfDiscontinuation}
                  onChange={(e) => setField("dateOfDiscontinuation", e.target.value)}
                />
              </div>
              <div className="col-md-6">
                <label className="form-label fw-semibold">{label("dateOfReborn", lang)}</label>
                <input
                  type="date"
                  className="form-control"
                  value={form.dateOfReborn}
                  onChange={(e) => setField("dateOfReborn", e.target.value)}
                />
              </div>

              <div className="col-md-6">
                <label className="form-label fw-semibold">{label("dateOfRejoin", lang)}</label>
                <input
                  type="date"
                  className="form-control"
                  value={form.dateOfRejoin}
                  onChange={(e) => setField("dateOfRejoin", e.target.value)}
                />
              </div>
              <div className="col-md-6" />

              <div className="col-12 mt-2">
                <h5 className="fw-bold text-primary mb-3">{label("permanentAddress", lang)}</h5>
                {fieldErrors.permanentAddress && <div className="text-danger small mb-2" role="alert">{fieldErrors.permanentAddress}</div>}
              </div>

              <div className="col-md-6">
                <label className="form-label fw-semibold">{label("state", lang)}</label>
                <select
                  className="form-select"
                  value={form.address.permanent.state === "Meghalaya" ? "Meghalaya" : form.address.permanent.state ? "Others" : ""}
                  onChange={(e) => setAddressField("state", e.target.value)}
                >
                  <option value="">Select state</option>
                  <option value="Meghalaya">Meghalaya</option>
                  <option value="Others">Others</option>
                </select>
                {form.address.permanent.state && form.address.permanent.state !== "Meghalaya" && (
                  <input
                    className="form-control mt-2"
                    value={form.address.permanent.state === "Others" ? "" : form.address.permanent.state}
                    onChange={(e) => setAddressField("state", e.target.value || "Others")}
                    placeholder="Enter state"
                  />
                )}
              </div>
              <div className="col-md-6">
                <label className="form-label fw-semibold">{label("district", lang)}</label>
                {form.address.permanent.state === "Meghalaya" ? (
                  <>
                    <select
                      className="form-select"
                      value={MEGHALAYA_DISTRICTS.includes(form.address.permanent.district) ? form.address.permanent.district : form.address.permanent.district ? "Others" : ""}
                      onChange={(e) => setAddressField("district", e.target.value)}
                    >
                      <option value="">Select district</option>
                      {MEGHALAYA_DISTRICTS.map((district) => (
                        <option key={district} value={district}>{district}</option>
                      ))}
                      <option value="Others">Others</option>
                    </select>
                    {form.address.permanent.district &&
                      (form.address.permanent.district === "Others" || !MEGHALAYA_DISTRICTS.includes(form.address.permanent.district)) && (
                        <input
                          className="form-control mt-2"
                          value={form.address.permanent.district === "Others" ? "" : form.address.permanent.district}
                          onChange={(e) => setAddressField("district", e.target.value || "Others")}
                          placeholder="Enter district"
                        />
                      )}
                  </>
                ) : (
                  <input
                    className="form-control"
                    value={form.address.permanent.district === "Others" ? "" : form.address.permanent.district}
                    onChange={(e) => setAddressField("district", e.target.value)}
                    placeholder={FIELD_PLACEHOLDERS.district}
                  />
                )}
              </div>

              <div className="col-md-6">
                <label className="form-label fw-semibold">{label("townCityVillage", lang)}</label>
                <input className="form-control" value={form.address.permanent.townCityVillage} onChange={(e) => setAddressField("townCityVillage", e.target.value)} placeholder={FIELD_PLACEHOLDERS.townCityVillage} />
              </div>
              <div className="col-md-6">
                <label className="form-label fw-semibold">{label("locality", lang)}</label>
                <input className="form-control" value={form.address.permanent.locality} onChange={(e) => setAddressField("locality", e.target.value)} placeholder={FIELD_PLACEHOLDERS.locality} />
              </div>

              <div className="col-md-6">
                <label className="form-label fw-semibold">{label("houseNumber", lang)}</label>
                <input className="form-control" value={form.address.permanent.houseNumber} onChange={(e) => setAddressField("houseNumber", e.target.value)} placeholder={FIELD_PLACEHOLDERS.houseNumber} />
              </div>
              <div className="col-md-6">
                <label className="form-label fw-semibold">{label("houseName", lang)}</label>
                <input className="form-control" value={form.address.permanent.houseName} onChange={(e) => setAddressField("houseName", e.target.value)} placeholder={FIELD_PLACEHOLDERS.houseName} />
              </div>

              <div className="col-md-6">
                <label className="form-label fw-semibold">{label("pinCode", lang)}</label>
                <input
                  className="form-control"
                  value={form.address.permanent.pinCode}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (/^\d{0,6}$/.test(value)) {
                      setAddressField("pinCode", value);
                      setPinError("");
                    } else {
                      setPinError("PIN can only contain numbers.");
                    }
                  }}
                  placeholder={FIELD_PLACEHOLDERS.pinCode}
                  inputMode="numeric"
                  maxLength={6}
                />
                {pinError ? <div className="text-danger small mt-2">{pinError}</div> : null}
              </div>
              <div className="col-md-6">
                <label className="form-label fw-semibold">{label("temporaryAddress", lang)}</label>
                <input className={`form-control ${fieldErrors.permanentAddress ? "is-invalid" : ""}`} value={form.address.temporary} onChange={(e) => setTemporaryAddress(e.target.value)} placeholder={FIELD_PLACEHOLDERS.temporaryAddress} />
                {fieldErrors.permanentAddress && <div className="invalid-feedback d-block">{fieldErrors.permanentAddress}</div>}
              </div>

              <div className="col-md-6">
                <label className="form-label fw-semibold">{label("guardianCaretaker", lang)}</label>
                <input className={`form-control ${fieldErrors.parentNames ? "is-invalid" : ""}`} value={form.address.guardianCaretaker} onChange={(e) => setGuardianCaretaker(e.target.value)} placeholder={FIELD_PLACEHOLDERS.guardianCaretaker} />
                {fieldErrors.parentNames && <div className="invalid-feedback d-block">{fieldErrors.parentNames}</div>}
              </div>
              <div className="col-md-6" />

              {admin && (
                <div className="col-12 mt-2">
                  <div className="form-check form-switch">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="is-deceased"
                      checked={!!form.isDeceased}
                      onChange={(event) => setField("isDeceased", event.target.checked)}
                    />
                    <label className="form-check-label fw-semibold" htmlFor="is-deceased">
                      Deceased
                    </label>
                  </div>
                </div>
              )}

              {status && (
                <div
                  className={`col-12 alert ${status.startsWith("Error:") || status.startsWith("Please") ? "alert-danger" : "alert-success"} mb-0`}
                  role="alert"
                  aria-live="polite"
                >
                  {status}
                </div>
              )}

              <div className="col-12 d-flex justify-content-start mt-3">
                <button
                  type="button"
                  className="btn btn-primary btn-lg px-4"
                  onClick={handleSave}
                  disabled={busy}
                >
                  {busy ? "Saving..." : label("save", lang)}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (isWeb) {
    return renderBootstrapPreview();
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.headerRow}>
        <Text variant="headlineSmall" style={styles.title}>
          {label("formTitle", lang)}
        </Text>
        <SegmentedButtons
          value={lang}
          onValueChange={setLang}
          buttons={LANGUAGES.map((l) => ({
            value: l,
            label: LANGUAGE_LABELS[l],
            style: {
              flex: 1,
              minHeight: 38,
              margin: 2,
              borderRadius: 8,
              backgroundColor: lang === l ? "#1d6fb8" : "#dfeaf7",
              borderWidth: 1,
              borderColor: "#1d6fb8",
            },
            labelStyle: {
              color: lang === l ? "#ffffff" : "#1d2b3a",
              fontWeight: "600",
            },
          }))}
          style={styles.langToggle}
        />
      </View>

      <View style={styles.radioGroup}>
        <Text variant="titleSmall" style={styles.sectionTitle}>
          {label("sex", lang)}
        </Text>
        <RadioButton.Group onValueChange={(v) => setField("sex", v)} value={form.sex}>
          <View style={styles.radioRow}>
            <RadioButton.Item
              label="Male"
              value="Male"
              position="leading"
              style={styles.radioItem}
              labelStyle={styles.radioLabel}
            />
            <RadioButton.Item
              label="Female"
              value="Female"
              position="leading"
              style={styles.radioItem}
              labelStyle={styles.radioLabel}
            />
            <RadioButton.Item
              label="Other"
              value="Other"
              position="leading"
              style={styles.radioItem}
              labelStyle={styles.radioLabel}
            />
          </View>
        </RadioButton.Group>
        {!!fieldErrors.sex && <HelperText type="error">{fieldErrors.sex}</HelperText>}
      </View>

      {isWeb ? (
        <>
          <View style={styles.twoColumnRow}>
            <View style={styles.halfColumn}>{renderDateField("dob", "dob")}</View>
            <View style={styles.halfColumn}>
              {renderTextField({
                labelKey: "phone",
                formKey: "phone",
                value: form.phone,
                onChangeText: handlePhoneChange,
                keyboardType: "number-pad",
                maxLength: 10,
              })}
            </View>
          </View>

          <View style={styles.twoColumnRow}>
            <View style={styles.halfColumn}>
              {renderTextField({
                labelKey: "fatherName",
                formKey: "fatherName",
                value: form.fatherName,
                onChangeText: (v) => setField("fatherName", v),
              })}
            </View>
            <View style={styles.halfColumn}>
              {renderTextField({
                labelKey: "motherName",
                formKey: "motherName",
                value: form.motherName,
                onChangeText: (v) => setField("motherName", v),
              })}
            </View>
          </View>

          <View style={styles.twoColumnRow}>
            <View style={styles.halfColumn}>{renderDateField("baptismDate", "baptismDate")}</View>
            <View style={styles.halfColumn}>{renderBaptizedByField()}</View>
          </View>

          <View style={styles.twoColumnRow}>
            <View style={styles.halfColumn}>
              {renderTextField({
                labelKey: "previousConvention",
                formKey: "previousConvention",
                value: form.previousConvention,
                onChangeText: (v) => setField("previousConvention", v),
              })}
            </View>
            <View style={styles.halfColumn}>
              {renderTextField({
                labelKey: "transitingToConvention",
                formKey: "transitingToConvention",
                value: form.transitingToConvention,
                onChangeText: (v) => setField("transitingToConvention", v),
              })}
            </View>
          </View>

          <View style={styles.twoColumnRow}>
            <View style={styles.halfColumn}>{renderDateField("dateOfDiscontinuation", "dateOfDiscontinuation")}</View>
            <View style={styles.halfColumn}>{renderDateField("dateOfReborn", "dateOfReborn")}</View>
          </View>

          <View style={styles.twoColumnRow}>
            <View style={styles.halfColumn}>{renderDateField("dateOfRejoin", "dateOfRejoin")}</View>
            <View style={styles.halfColumn} />
          </View>
        </>
      ) : (
        BASIC_FIELDS.map(([labelKey, formKey]) => {
          if (formKey === "baptizedBy") return renderBaptizedByField();
          if (DATE_FIELDS.has(formKey)) return renderDateField(labelKey, formKey);
          return renderTextField({
            labelKey,
            formKey,
            value: form[formKey],
            onChangeText: formKey === "phone" ? handlePhoneChange : (v) => setField(formKey, v),
            keyboardType: formKey === "phone" ? "number-pad" : "default",
            maxLength: formKey === "phone" ? 10 : undefined,
          });
        })
      )}

      <Text variant="titleSmall" style={styles.sectionTitle}>
        {label("permanentAddress", lang)}
      </Text>
      {!!fieldErrors.permanentAddress && (
        <HelperText type="error">{fieldErrors.permanentAddress}</HelperText>
      )}
      {isWeb ? (
        Array.from({ length: Math.ceil(PERMANENT_ADDRESS_FIELDS.length / 2) }, (_, rowIndex) => {
          const rowFields = PERMANENT_ADDRESS_FIELDS.slice(rowIndex * 2, rowIndex * 2 + 2);
          return (
            <View key={`permanent-address-row-${rowIndex}`} style={styles.twoColumnRow}>
              <View style={styles.halfColumn}>
                {rowFields[0] ? renderPermanentAddressField(rowFields[0][0], rowFields[0][1]) : null}
              </View>
              <View style={styles.halfColumn}>
                {rowFields[1] ? renderPermanentAddressField(rowFields[1][0], rowFields[1][1]) : null}
              </View>
            </View>
          );
        })
      ) : (
        PERMANENT_ADDRESS_FIELDS.map(([labelKey, addrKey]) => renderPermanentAddressField(labelKey, addrKey))
      )}

      {isWeb ? (
        <>
          <View style={styles.twoColumnRow}>
            <View style={styles.halfColumn}>
              <View style={styles.compactFieldBlock}>
                <Text style={styles.fieldLabel}>{label("temporaryAddress", lang)}</Text>
                <TextInput
                  value={form.address.temporary}
                  onChangeText={setTemporaryAddress}
                  mode="outlined"
                  style={[styles.input, styles.compactInput]}
                  contentStyle={styles.inputText}
                  labelStyle={styles.inputLabel}
                  textColor="#000000"
                  placeholderTextColor={placeholderColor}
                  placeholder={FIELD_PLACEHOLDERS.temporaryAddress}
                  theme={inputTheme}
                  error={!!fieldErrors.permanentAddress}
                />
                {!!fieldErrors.permanentAddress && <HelperText type="error">{fieldErrors.permanentAddress}</HelperText>}
              </View>
            </View>
            <View style={styles.halfColumn}>
              <View style={styles.compactFieldBlock}>
                <Text style={styles.fieldLabel}>{label("guardianCaretaker", lang)}</Text>
                <TextInput
                  value={form.address.guardianCaretaker}
                  onChangeText={setGuardianCaretaker}
                  mode="outlined"
                  style={[styles.input, styles.compactInput]}
                  contentStyle={styles.inputText}
                  labelStyle={styles.inputLabel}
                  textColor="#000000"
                  placeholderTextColor={placeholderColor}
                  placeholder={FIELD_PLACEHOLDERS.guardianCaretaker}
                  theme={inputTheme}
                  error={!!fieldErrors.parentNames}
                />
                {!!fieldErrors.parentNames && <HelperText type="error">{fieldErrors.parentNames}</HelperText>}
              </View>
            </View>
          </View>
        </>
      ) : (
        <>
          <View style={styles.compactFieldBlock}>
            <Text style={styles.fieldLabel}>{label("temporaryAddress", lang)}</Text>
            <TextInput
              value={form.address.temporary}
              onChangeText={setTemporaryAddress}
              mode="outlined"
              style={[styles.input, styles.compactInput]}
              contentStyle={styles.inputText}
              labelStyle={styles.inputLabel}
              textColor="#000000"
              placeholderTextColor={placeholderColor}
              placeholder={FIELD_PLACEHOLDERS.temporaryAddress}
              theme={inputTheme}
              error={!!fieldErrors.permanentAddress}
            />
            {!!fieldErrors.permanentAddress && <HelperText type="error">{fieldErrors.permanentAddress}</HelperText>}
          </View>
          <View style={styles.compactFieldBlock}>
            <Text style={styles.fieldLabel}>{label("guardianCaretaker", lang)}</Text>
            <TextInput
              value={form.address.guardianCaretaker}
              onChangeText={setGuardianCaretaker}
              mode="outlined"
              style={[styles.input, styles.compactInput]}
              contentStyle={styles.inputText}
              labelStyle={styles.inputLabel}
              textColor="#000000"
              placeholderTextColor={placeholderColor}
              placeholder={FIELD_PLACEHOLDERS.guardianCaretaker}
              theme={inputTheme}
              error={!!fieldErrors.parentNames}
            />
            {!!fieldErrors.parentNames && <HelperText type="error">{fieldErrors.parentNames}</HelperText>}
          </View>
        </>
      )}

      {admin && (
        <>
          <Text variant="titleSmall" style={styles.sectionTitle}>
            Admin-only fields
          </Text>
          <View style={styles.deceasedToggleRow}>
            <Text style={styles.fieldLabel}>Deceased</Text>
            <Switch
              value={!!form.isDeceased}
              onValueChange={(value) => setField("isDeceased", value)}
              accessibilityLabel="Mark member as deceased"
            />
          </View>
          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>{label("dateOfDeath", lang)}</Text>
            <TextInput
              value={form.dateOfDeath}
              onChangeText={(v) => setField("dateOfDeath", v)}
              mode="outlined"
              style={styles.input}
              contentStyle={styles.inputText}
              labelStyle={styles.inputLabel}
              textColor="#000000"
              placeholderTextColor={placeholderColor}
              placeholder={FIELD_PLACEHOLDERS.dateOfDeath}
              theme={inputTheme}
            />
          </View>
          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>{label("remarks", lang)}</Text>
            <TextInput
              value={form.remarks}
              onChangeText={(v) => setField("remarks", v)}
              mode="outlined"
              multiline
              style={styles.input}
              contentStyle={styles.inputText}
              labelStyle={styles.inputLabel}
              textColor="#000000"
              placeholderTextColor={placeholderColor}
              placeholder="E.g. active member / moved / transferred"
              theme={inputTheme}
            />
          </View>
        </>
      )}

      <Button mode="contained" onPress={handleSave} loading={busy} disabled={busy}>
        {label("save", lang)}
      </Button>

      {!!status && (
        <HelperText type={status.startsWith("Please") || status.startsWith("Error:") ? "error" : "info"}>
          {status}
        </HelperText>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#dfeaf7",
  },
  headerRow: { marginBottom: 20 },
  title: { marginBottom: 12, color: "#1d2b3a" },
  langToggle: { marginBottom: 8 },
  sectionTitle: { marginTop: 16, marginBottom: 8, color: "#1d2b3a" },
  radioGroup: {
    marginBottom: 12,
  },
  radioRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  radioItem: {
    flex: 1,
    backgroundColor: "#cfe0f3",
    borderRadius: 8,
  },
  radioLabel: {
    color: "#1d2b3a",
    fontSize: 14,
  },
  deceasedToggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  input: {
    marginBottom: 12,
    backgroundColor: "#cfe0f3",
  },
  inputText: {
    color: "#000000",
  },
  inputLabel: {
    color: "#000000",
  },
  fieldBlock: {
    marginBottom: 4,
  },
  compactFieldBlock: {
    marginBottom: 8,
  },
  compactInput: {
    width: "100%",
    marginBottom: 0,
  },
  fieldLabel: {
    color: "#1d2b3a",
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 6,
    marginLeft: 4,
  },
  errorText: {
    color: "#d32f2f",
    marginTop: -8,
  },
  datePickerWrapper: {
    backgroundColor: "#ffffff",
    borderRadius: 10,
    marginBottom: 12,
    overflow: "hidden",
  },
  twoColumnRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 2,
  },
  halfColumn: {
    flex: 1,
    minWidth: 0,
  },
  webDatePickerBlock: {
    marginBottom: 8,
  },
  webDateLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1d2b3a",
    marginBottom: 6,
  },
  baptizedByMenu: {
    backgroundColor: "#ffffff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#1d6fb8",
    elevation: 4,
    shadowColor: "#000000",
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  menuItemText: {
    color: "#1d2b3a",
  },
});

// Match the web date-picker visual size to the standard text inputs.
const webDatePickerStyle = `
  .web-date-picker-wrapper {
    width: 100%;
  }

  .web-date-picker-input {
    width: 100%;
    min-height: 56px;
    padding: 14px 16px;
    border: 1px solid #000000;
    border-radius: 6px;
    background-color: #cfe0f3;
    color: #000000;
    font-size: 16px;
    line-height: 1.2;
    box-sizing: border-box;
  }

  .web-date-picker-input::placeholder,
  .react-datepicker__input-container input::placeholder {
    color: rgba(0, 0, 0, 0.5) !important;
  }

  .web-date-picker-input:focus {
    outline: 2px solid #1d6fb8;
    outline-offset: 1px;
  }

  .react-datepicker-wrapper {
    width: 100%;
  }

  .react-datepicker__input-container {
    width: 100%;
  }

  .react-datepicker {
    border: 1px solid #cfe0f3;
    border-radius: 10px;
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.12);
    font-family: "Segoe UI", "Helvetica Neue", Arial, sans-serif;
    font-size: 14px;
  }

  .react-datepicker__day,
  .react-datepicker__day-name,
  .react-datepicker__time-name,
  .react-datepicker__current-month,
  .react-datepicker__month-select,
  .react-datepicker__year-select,
  .react-datepicker__month-read-view,
  .react-datepicker__year-read-view {
    font-family: "Segoe UI", "Helvetica Neue", Arial, sans-serif;
  }

  .react-datepicker__header {
    background-color: #dfeaf7;
    border-bottom: 1px solid #cfe0f3;
  }

  .react-datepicker__current-month,
  .react-datepicker-time__header,
  .react-datepicker-year-header {
    color: #1d2b3a;
    font-weight: 600;
  }

  .react-datepicker__day-name,
  .react-datepicker__day,
  .react-datepicker__time-name {
    color: #1d2b3a;
  }

  .react-datepicker__day:hover,
  .react-datepicker__month-text:hover,
  .react-datepicker__quarter-text:hover,
  .react-datepicker__year-text:hover {
    background-color: #dfeaf7;
  }

  .react-datepicker__day--selected,
  .react-datepicker__day--keyboard-selected,
  .react-datepicker__day--today {
    background-color: #1d6fb8;
    color: #ffffff;
    border-radius: 50%;
  }

  .react-datepicker__day--outside-month {
    color: #9aa7b5;
  }

  .react-datepicker__navigation {
    top: 12px;
  }

  .react-datepicker__navigation-icon::before {
    border-color: #1d6fb8;
  }

  .react-datepicker__month-select,
  .react-datepicker__year-select {
    border: 1px solid #cfe0f3;
    border-radius: 6px;
    background-color: #ffffff;
    color: #1d2b3a;
    padding: 4px 8px;
  }
`;

if (typeof document !== "undefined") {
  const existingStyle = document.getElementById("web-date-picker-style");
  if (!existingStyle) {
    const styleTag = document.createElement("style");
    styleTag.id = "web-date-picker-style";
    styleTag.textContent = webDatePickerStyle;
    document.head.appendChild(styleTag);
  }
}
