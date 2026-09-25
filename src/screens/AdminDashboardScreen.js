import React, { useState, useCallback } from "react";
import { View, ScrollView, StyleSheet } from "react-native";
import { Text, Card, DataTable, IconButton, ActivityIndicator } from "react-native-paper";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { listMembers, computeAnalytics } from "../utils/firestoreHelpers";

// Columns shown in the scrollable table. Add/remove freely — the
// horizontal ScrollView makes the table scroll sideways regardless of
// how many columns are listed here.
const COLUMNS = [
  { key: "name", label: "Name", width: 160 },
  { key: "sex", label: "Sex", width: 80 },
  { key: "dob", label: "DOB", width: 110 },
  { key: "phone", label: "Phone", width: 120 },
  { key: "position", label: "Position", width: 120 },
  { key: "baptismDate", label: "Baptism Date", width: 120 },
  { key: "dateOfDeath", label: "Date of Death", width: 120 },
];

function AnalyticsSection({ analytics, loading }) {
  if (loading) return <ActivityIndicator style={{ marginVertical: 24 }} />;

  const years = Array.from(
    new Set([
      ...Object.keys(analytics.deathsByYear),
      ...Object.keys(analytics.baptismsByYear),
    ])
  ).sort();

  return (
    <View style={styles.analyticsSection}>
      <Text variant="titleMedium" style={styles.sectionTitle}>
        Analytics
      </Text>

      <View style={styles.cardRow}>
        <Card style={styles.totalCard}>
          <Card.Content>
            <Text variant="labelMedium">Total Baptized — Male</Text>
            <Text variant="headlineMedium">{analytics.totalBaptized.M}</Text>
          </Card.Content>
        </Card>
        <Card style={styles.totalCard}>
          <Card.Content>
            <Text variant="labelMedium">Total Baptized — Female</Text>
            <Text variant="headlineMedium">{analytics.totalBaptized.F}</Text>
          </Card.Content>
        </Card>
      </View>

      <Text variant="titleSmall" style={styles.subTitle}>
        By Year (Male / Female)
      </Text>
      <ScrollView horizontal>
        <DataTable style={{ minWidth: 500 }}>
          <DataTable.Header>
            <DataTable.Title>Year</DataTable.Title>
            <DataTable.Title numeric>Baptized (M)</DataTable.Title>
            <DataTable.Title numeric>Baptized (F)</DataTable.Title>
            <DataTable.Title numeric>Deaths (M)</DataTable.Title>
            <DataTable.Title numeric>Deaths (F)</DataTable.Title>
          </DataTable.Header>
          {years.map((year) => (
            <DataTable.Row key={year}>
              <DataTable.Cell>{year}</DataTable.Cell>
              <DataTable.Cell numeric>
                {analytics.baptismsByYear[year]?.M || 0}
              </DataTable.Cell>
              <DataTable.Cell numeric>
                {analytics.baptismsByYear[year]?.F || 0}
              </DataTable.Cell>
              <DataTable.Cell numeric>
                {analytics.deathsByYear[year]?.M || 0}
              </DataTable.Cell>
              <DataTable.Cell numeric>
                {analytics.deathsByYear[year]?.F || 0}
              </DataTable.Cell>
            </DataTable.Row>
          ))}
          {years.length === 0 && (
            <DataTable.Row>
              <DataTable.Cell>No baptism/death dates on file yet</DataTable.Cell>
            </DataTable.Row>
          )}
        </DataTable>
      </ScrollView>
    </View>
  );
}

function UserListSection({ members, loading, onEdit }) {
  return (
    <View style={styles.listSection}>
      <Text variant="titleMedium" style={styles.sectionTitle}>
        Members
      </Text>
      {loading ? (
        <ActivityIndicator style={{ marginVertical: 24 }} />
      ) : (
        <ScrollView horizontal>
          <View>
            <DataTable style={{ minWidth: 60 + COLUMNS.reduce((s, c) => s + c.width, 0) }}>
              <DataTable.Header>
                <DataTable.Title style={{ width: 50 }}>#</DataTable.Title>
                {COLUMNS.map((c) => (
                  <DataTable.Title key={c.key} style={{ width: c.width }}>
                    {c.label}
                  </DataTable.Title>
                ))}
                <DataTable.Title style={{ width: 60 }}>Edit</DataTable.Title>
              </DataTable.Header>

              <ScrollView style={{ maxHeight: 420 }}>
                {members.map((m, index) => (
                  <DataTable.Row key={m.id}>
                    <DataTable.Cell style={{ width: 50 }}>{index + 1}</DataTable.Cell>
                    {COLUMNS.map((c) => (
                      <DataTable.Cell key={c.key} style={{ width: c.width }}>
                        {m[c.key] || "—"}
                      </DataTable.Cell>
                    ))}
                    <DataTable.Cell style={{ width: 60 }}>
                      <IconButton icon="pencil" size={18} onPress={() => onEdit(m)} />
                    </DataTable.Cell>
                  </DataTable.Row>
                ))}
              </ScrollView>
            </DataTable>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

export default function AdminDashboardScreen() {
  const navigation = useNavigation();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const all = await listMembers();
      setMembers(all);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const analytics = computeAnalytics(members);

  const handleEdit = (member) => {
    // Hand the selected member's id to the data-entry screen so it loads
    // in edit mode instead of starting a blank form.
    navigation.navigate("DataEntryAdmin", { memberId: member.id });
  };

  return (
    <ScrollView style={styles.container}>
      <AnalyticsSection analytics={analytics} loading={loading} />
      <UserListSection members={members} loading={loading} onEdit={handleEdit} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  analyticsSection: { marginBottom: 28 },
  listSection: { marginBottom: 28 },
  sectionTitle: { marginBottom: 12 },
  subTitle: { marginTop: 8, marginBottom: 4 },
  cardRow: { flexDirection: "row", gap: 12, marginBottom: 16 },
  totalCard: { flex: 1 },
});
