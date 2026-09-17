import { useEffect, useState } from "react";
import { StatusBar } from "expo-status-bar";
import { StyleSheet, Text, View } from "react-native";
import { apiRequest } from "./src/api/client";
import { API_URL } from "./src/api/config";

export default function App() {
  const [status, setStatus] = useState<string>("Connexion au backend…");

  useEffect(() => {
    apiRequest<{ status: string; timestamp: string }>("/health")
      .then((res) => setStatus(`Backend OK — ${res.timestamp}`))
      .catch((err) => setStatus(`Erreur : ${err instanceof Error ? err.message : String(err)}`));
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>OROKIA</Text>
      <Text style={styles.status}>{status}</Text>
      <Text style={styles.url}>{API_URL}</Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 24,
  },
  title: { fontSize: 24, fontWeight: "800", color: "#102A43" },
  status: { fontSize: 14, color: "#334155", textAlign: "center" },
  url: { fontSize: 12, color: "#94A3B8" },
});
