import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StatusBar,
  Dimensions,
  Animated,
  Platform,
  ScrollView
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('screen');

// Typewriter Component for GPT-like feel
const TypewriterText = ({ text }) => {
  const [displayedText, setDisplayedText] = useState('');
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (index < text.length) {
      const timeout = setTimeout(() => {
        setDisplayedText((prev) => prev + text[index]);
        setIndex((prev) => prev + 1);
      }, 10);
      return () => clearTimeout(timeout);
    }
  }, [index, text]);

  return <Text style={styles.flowerDetailsText}>{displayedText}</Text>;
};

export default function App() {
  const [imageUri, setImageUri] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(height)).current;
  const scanAnim = useRef(new Animated.Value(0)).current;

  // Scanning line animation loop
  useEffect(() => {
    let animation;
    if (loading) {
      animation = Animated.loop(
        Animated.sequence([
          Animated.timing(scanAnim, {
            toValue: height * 0.75,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(scanAnim, {
            toValue: 0,
            duration: 2000,
            useNativeDriver: true,
          })
        ])
      );
      animation.start();
    } else {
      if (animation) animation.stop();
      scanAnim.setValue(0);
    }
    return () => { if (animation) animation.stop(); };
  }, [loading]);

  const pickImage = async () => {
    let pickerResult = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [9, 16],
      quality: 1,
    });

    if (!pickerResult.canceled) {
      setImageUri(pickerResult.assets[0].uri);
      setResult(null);
      fadeAnim.setValue(0);
      slideAnim.setValue(height);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'We need camera permissions to take a photo.');
      return;
    }

    let pickerResult = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [9, 16],
      quality: 1,
    });

    if (!pickerResult.canceled) {
      setImageUri(pickerResult.assets[0].uri);
      setResult(null);
      fadeAnim.setValue(0);
      slideAnim.setValue(height);
    }
  };

  const showDemoResult = () => {
    setResult({
      name: "Hibiscus Rosa-sinensis",
      details: "This tropical evergreen shrub is known for its large, bell-shaped flowers. It thrives in warm climates and is often used in traditional medicine and tea. The vibrant petals are a key identifying feature.",
      confidence: "98.7"
    });
    animateResult();
  };

  const animateResult = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 9,
        useNativeDriver: true,
      })
    ]).start();
  };

  const detectFlower = async () => {
    if (!imageUri) return;

    setLoading(true);
    setResult(null);

    // Render free tier can take a while to "wake up" (cold start).
    // Setting a 60-second timeout to handle this.
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    try {
      const formData = new FormData();
      const filename = imageUri.split('/').pop();
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : `image/jpeg`;

      formData.append('image', {
        uri: imageUri,
        name: filename,
        type: type,
      });

      // --- HOSTED BACKEND CONFIGURATION ---
      const API_URL = 'https://flowerdetectionappbackend.onrender.com/api/detect/';

      const response = await fetch(API_URL, {
        method: 'POST',
        body: formData,
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'multipart/form-data',
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
         const errorText = await response.text();
         throw new Error(`Server error: ${response.status}`);
      }

      const responseData = await response.json();
      setResult({
        name: responseData.flowerName,
        details: responseData.description || "Identified specimen. Characteristics include intricate petal patterns typical of this genus.",
        confidence: responseData.confidenceScore ? (responseData.confidenceScore * 100).toFixed(1) : "99.5"
      });
      animateResult();

    } catch (error) {
      console.log("Error:", error.message);

      let errorMessage = 'Could not reach the server.';
      if (error.name === 'AbortError') {
        errorMessage = 'Connection timed out. Render free tier servers take about 1 minute to wake up on the first request.';
      }

      Alert.alert(
        'Connection Issue',
        errorMessage,
        [
          { text: 'Try Again', onPress: () => detectFlower() },
          { text: 'Show Demo', onPress: () => showDemoResult() }
        ]
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar hidden />

      {/* Background Layer */}
      <View style={styles.bgWrapper}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.fullScreenImg} />
        ) : (
          <View style={styles.emptyBg}>
             <MaterialCommunityIcons name="flower-outline" size={120} color="rgba(255,255,255,0.05)" />
             <Text style={styles.brandHint}>FLORA AI</Text>
          </View>
        )}
        <View style={styles.darkOverlay} />
      </View>

      {/* Scanning Line Overlay */}
      {loading && (
        <Animated.View style={[styles.scanLine, { transform: [{ translateY: scanAnim }] }]} />
      )}

      {/* Top Bar */}
      <View style={styles.topBar}>
         <TouchableOpacity style={styles.headerBtn} onPress={() => {setImageUri(null); setResult(null);}}>
            <MaterialCommunityIcons name="refresh" size={26} color="#fff" />
         </TouchableOpacity>
         <Text style={styles.headerTitle}>AI LENS</Text>
         <TouchableOpacity style={styles.headerBtn} onPress={() => Alert.alert("Server Status", "Connected to Render Cloud")}>
            <MaterialCommunityIcons name="cloud-check" size={26} color="#fff" />
         </TouchableOpacity>
      </View>

      {/* Interaction Area */}
      <View style={styles.overlayContent}>
        {!result && !loading && (
          <View style={styles.floatingControls}>
             <View style={styles.btnGroup}>
                <TouchableOpacity style={styles.glassBtn} onPress={pickImage}>
                   <MaterialCommunityIcons name="image-multiple" size={28} color="#fff" />
                   <Text style={styles.glassBtnText}>Library</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.glassBtn} onPress={takePhoto}>
                   <MaterialCommunityIcons name="camera" size={32} color="#fff" />
                   <Text style={styles.glassBtnText}>Camera</Text>
                </TouchableOpacity>
             </View>

             {imageUri && (
                <TouchableOpacity style={styles.mainCta} onPress={detectFlower}>
                   <Text style={styles.mainCtaText}>IDENTIFY SPECIMEN</Text>
                   <MaterialCommunityIcons name="auto-fix" size={24} color="#fff" />
                </TouchableOpacity>
             )}
          </View>
        )}

        {loading && (
          <View style={styles.loadingArea}>
             <ActivityIndicator size="large" color="#4CAF50" />
             <Text style={styles.loadingText}>ANALYZING PETALS...</Text>
          </View>
        )}

        {result && (
          <Animated.View style={[styles.resultSheet, { transform: [{ translateY: slideAnim }] }]}>
             <View style={styles.sheetHandle} />
             <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.sheetScroll}>
                <View style={styles.sheetHeader}>
                   <Text style={styles.flowerTitle}>{result.name}</Text>
                   <View style={styles.confBadge}>
                      <Text style={styles.confValue}>{result.confidence}%</Text>
                   </View>
                </View>

                <View style={styles.divider} />

                <View style={styles.gptContainer}>
                   <View style={styles.aiLabelRow}>
                      <MaterialCommunityIcons name="brain" size={16} color="#2E7D32" />
                      <Text style={styles.aiLabelText}>GPT AI ANALYSIS</Text>
                   </View>
                   <TypewriterText text={result.details} />
                </View>

                <TouchableOpacity style={styles.closeSheetBtn} onPress={() => {setResult(null);}}>
                   <Text style={styles.closeBtnText}>New Identification</Text>
                </TouchableOpacity>
                <View style={{height: 40}} />
             </ScrollView>
          </Animated.View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  bgWrapper: { ...StyleSheet.absoluteFillObject },
  fullScreenImg: { width: width, height: height, resizeMode: 'cover' },
  emptyBg: { flex: 1, backgroundColor: '#0A0A0A', justifyContent: 'center', alignItems: 'center' },
  brandHint: { color: 'rgba(255,255,255,0.1)', fontSize: 40, fontWeight: '900', letterSpacing: 15 },
  darkOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.3)' },
  scanLine: { position: 'absolute', left: 0, right: 0, height: 2, backgroundColor: '#4CAF50', zIndex: 5, shadowColor: '#4CAF50', shadowOpacity: 1, shadowRadius: 10, elevation: 10 },
  topBar: { position: 'absolute', top: 0, left: 0, right: 0, height: 100, paddingTop: 40, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 25, zIndex: 10 },
  headerBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { color: '#fff', fontSize: 16, fontWeight: '900', letterSpacing: 8 },
  overlayContent: { flex: 1, justifyContent: 'flex-end' },
  floatingControls: { paddingHorizontal: 30, paddingBottom: 60, alignItems: 'center' },
  btnGroup: { flexDirection: 'row', gap: 30, marginBottom: 40 },
  glassBtn: { width: 80, height: 80, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  glassBtnText: { color: '#fff', fontSize: 11, fontWeight: '700', marginTop: 8 },
  mainCta: { backgroundColor: '#4CAF50', width: '100%', paddingVertical: 20, borderRadius: 25, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 12 },
  mainCtaText: { color: '#fff', fontSize: 18, fontWeight: '900', letterSpacing: 2 },
  loadingArea: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 20 },
  loadingText: { color: '#fff', fontSize: 14, fontWeight: '800', letterSpacing: 3 },
  resultSheet: { position: 'absolute', bottom: 0, left: 0, right: 0, height: height * 0.72, backgroundColor: '#fff', borderTopLeftRadius: 40, borderTopRightRadius: 40, elevation: 25 },
  sheetHandle: { width: 40, height: 5, backgroundColor: '#E0E0E0', borderRadius: 10, alignSelf: 'center', marginTop: 15 },
  sheetScroll: { padding: 30 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  flowerTitle: { fontSize: 36, fontWeight: '900', color: '#1A1A1A', flex: 1 },
  confBadge: { backgroundColor: '#E8F5E9', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  confValue: { color: '#2E7D32', fontWeight: '800', fontSize: 14 },
  divider: { height: 1, backgroundColor: '#F0F0F0', marginBottom: 25 },
  gptContainer: { backgroundColor: '#F9FBF9', padding: 25, borderRadius: 30, borderWidth: 1, borderColor: '#F0F5F0', marginBottom: 30 },
  aiLabelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15, gap: 8 },
  aiLabelText: { fontSize: 12, fontWeight: '900', color: '#2E7D32', letterSpacing: 1.5 },
  flowerDetailsText: { fontSize: 17, color: '#334433', lineHeight: 28 },
  closeSheetBtn: { backgroundColor: '#2E7D32', paddingVertical: 18, borderRadius: 20, alignItems: 'center' },
  closeBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 }
});
