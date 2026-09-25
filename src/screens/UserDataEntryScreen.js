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
  ["townCityVillage", "townCityVillage"],
  ["district", "district"],
  ["locality", "locality"],
  ["houseNumber", "houseNumber"],
  ["houseName", "houseName"],
  ["pinCode", "pinCode"],
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
  const [pinError, setPinError] = useState("");
  const isWeb = Platform.OS === "web";
  const placeholderColor = "#6b7280";

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

  const setField = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  const setAddressField = (key, value) =>
    setForm((f) => ({
      ...f,
      address: {
        ...f.address,
        permanent: { ...f.address.permanent, [key]: value },
      },
    }));

  const handleSave = async () => {
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
  }) => (
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
      />
    </View>
  );

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
                onChangeText: (v) => setField("phone", v),
                keyboardType: "phone-pad",
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
            onChangeText: (v) => setField(formKey, v),
          });
        })
      )}

      <Text variant="titleSmall" style={styles.sectionTitle}>
        {label("permanentAddress", lang)}
      </Text>
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

      <View style={styles.fieldBlock}>
        <Text style={styles.fieldLabel}>{label("temporaryAddress", lang)}</Text>
        <TextInput
          value={form.address.temporary}
          onChangeText={(v) =>
            setForm((f) => ({ ...f, address: { ...f.address, temporary: v } }))
          }
          mode="outlined"
          style={styles.input}
          contentStyle={styles.inputText}
          labelStyle={styles.inputLabel}
          textColor="#000000"
          placeholderTextColor={placeholderColor}
          placeholder={FIELD_PLACEHOLDERS.temporaryAddress}
          theme={inputTheme}
        />
      </View>
      <View style={styles.fieldBlock}>
        <Text style={styles.fieldLabel}>{label("guardianCaretaker", lang)}</Text>
        <TextInput
          value={form.address.guardianCaretaker}
          onChangeText={(v) =>
            setForm((f) => ({ ...f, address: { ...f.address, guardianCaretaker: v } }))
          }
          mode="outlined"
          style={styles.input}
          contentStyle={styles.inputText}
          labelStyle={styles.inputLabel}
          textColor="#000000"
          placeholderTextColor={placeholderColor}
          placeholder={FIELD_PLACEHOLDERS.guardianCaretaker}
          theme={inputTheme}
        />
      </View>

      {admin && (
        <>
          <Text variant="titleSmall" style={styles.sectionTitle}>
            Admin-only fields
          </Text>
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

      {!!status && <HelperText type="info">{status}</HelperText>}
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
