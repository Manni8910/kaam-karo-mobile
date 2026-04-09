import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, Modal, FlatList,
  TextInput, StyleSheet, SafeAreaView, Dimensions,
} from 'react-native';

const { height } = Dimensions.get('window');

export const INDIA_LOCATIONS = {
  'Andhra Pradesh': ['Visakhapatnam', 'Vijayawada', 'Guntur', 'Tirupati', 'Kakinada', 'Nellore'],
  'Arunachal Pradesh': ['Itanagar', 'Naharlagun', 'Pasighat', 'Tawang'],
  'Assam': ['Guwahati', 'Silchar', 'Dibrugarh', 'Jorhat', 'Nagaon', 'Tinsukia'],
  'Bihar': ['Patna', 'Gaya', 'Bhagalpur', 'Muzaffarpur', 'Purnia', 'Darbhanga'],
  'Chhattisgarh': ['Raipur', 'Bhilai', 'Bilaspur', 'Korba', 'Durg', 'Rajnandgaon'],
  'Goa': ['Panaji', 'Margao', 'Vasco da Gama', 'Mapusa', 'Ponda'],
  'Gujarat': ['Ahmedabad', 'Surat', 'Vadodara', 'Rajkot', 'Gandhinagar', 'Bhavnagar', 'Jamnagar'],
  'Haryana': ['Gurugram', 'Faridabad', 'Panipat', 'Ambala', 'Hisar', 'Rohtak', 'Karnal'],
  'Himachal Pradesh': ['Shimla', 'Manali', 'Dharamshala', 'Solan', 'Mandi', 'Kullu'],
  'Jharkhand': ['Ranchi', 'Jamshedpur', 'Dhanbad', 'Bokaro', 'Deoghar', 'Hazaribagh'],
  'Karnataka': ['Bengaluru', 'Mysuru', 'Mangaluru', 'Hubballi', 'Belagavi', 'Kalaburagi'],
  'Kerala': ['Thiruvananthapuram', 'Kochi', 'Kozhikode', 'Thrissur', 'Kollam', 'Kannur'],
  'Madhya Pradesh': ['Bhopal', 'Indore', 'Jabalpur', 'Gwalior', 'Ujjain', 'Sagar'],
  'Maharashtra': ['Mumbai', 'Pune', 'Nagpur', 'Nashik', 'Aurangabad', 'Solapur', 'Thane'],
  'Manipur': ['Imphal', 'Thoubal', 'Bishnupur', 'Churachandpur'],
  'Meghalaya': ['Shillong', 'Tura', 'Jowai', 'Nongstoin'],
  'Mizoram': ['Aizawl', 'Lunglei', 'Champhai', 'Serchhip'],
  'Nagaland': ['Kohima', 'Dimapur', 'Mokokchung', 'Tuensang'],
  'Odisha': ['Bhubaneswar', 'Cuttack', 'Rourkela', 'Berhampur', 'Sambalpur', 'Puri'],
  'Punjab': ['Ludhiana', 'Amritsar', 'Jalandhar', 'Patiala', 'Bathinda', 'Mohali', 'Pathankot'],
  'Rajasthan': ['Jaipur', 'Jodhpur', 'Udaipur', 'Kota', 'Bikaner', 'Ajmer', 'Alwar'],
  'Sikkim': ['Gangtok', 'Namchi', 'Gyalshing', 'Mangan'],
  'Tamil Nadu': ['Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem', 'Tirunelveli'],
  'Telangana': ['Hyderabad', 'Warangal', 'Nizamabad', 'Karimnagar', 'Khammam'],
  'Tripura': ['Agartala', 'Udaipur', 'Dharmanagar', 'Kailasahar'],
  'Uttar Pradesh': ['Lucknow', 'Kanpur', 'Agra', 'Varanasi', 'Prayagraj', 'Meerut', 'Noida', 'Ghaziabad'],
  'Uttarakhand': ['Dehradun', 'Haridwar', 'Roorkee', 'Haldwani', 'Nainital', 'Rishikesh'],
  'West Bengal': ['Kolkata', 'Howrah', 'Durgapur', 'Asansol', 'Siliguri', 'Bardhaman'],
  'Andaman & Nicobar Islands': ['Port Blair', 'Diglipur', 'Rangat'],
  'Chandigarh': ['Chandigarh'],
  'Delhi (NCT)': ['New Delhi', 'Dwarka', 'Rohini', 'Saket', 'Noida Extension', 'Lajpat Nagar'],
  'Jammu & Kashmir': ['Srinagar', 'Jammu', 'Anantnag', 'Baramulla', 'Sopore'],
  'Ladakh': ['Leh', 'Kargil'],
  'Puducherry': ['Puducherry', 'Karaikal', 'Yanam', 'Mahe'],
};

export const ALL_STATES = Object.keys(INDIA_LOCATIONS).sort();

export default function LocationPicker({ value, onChange, placeholder = 'Select Location' }) {
  const [modalVisible, setModalVisible] = useState(false);
  const [step, setStep] = useState('state');
  const [selectedState, setSelectedState] = useState(value?.state || null);
  const [selectedCity, setSelectedCity] = useState(value?.city || null);
  const [search, setSearch] = useState('');

  const open = () => { setStep('state'); setSearch(''); setModalVisible(true); };
  const close = () => setModalVisible(false);

  const selectState = (state) => {
    setSelectedState(state);
    setSelectedCity(null);
    setSearch('');
    setStep('city');
  };

  const selectCity = (city) => {
    setSelectedCity(city);
    onChange?.({ state: selectedState, city, label: `${city}, ${selectedState}` });
    close();
    setSearch('');
  };

  const skipCity = () => {
    onChange?.({ state: selectedState, city: null, label: selectedState });
    close();
    setSearch('');
  };

  const displayLabel = () => {
    if (value?.label) return value.label;
    if (selectedCity && selectedState) return `${selectedCity}, ${selectedState}`;
    if (selectedState) return selectedState;
    return null;
  };

  const list =
    step === 'state'
      ? ALL_STATES.filter(s => s.toLowerCase().includes(search.toLowerCase()))
      : (INDIA_LOCATIONS[selectedState] || []).filter(c => c.toLowerCase().includes(search.toLowerCase()));

  return (
    <>
      <TouchableOpacity style={styles.trigger} onPress={open} activeOpacity={0.75}>
        <Text style={[styles.triggerText, !displayLabel() && styles.placeholder]}>
          {displayLabel() || placeholder}
        </Text>
        <Text style={styles.chevron}>v</Text>
      </TouchableOpacity>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.overlay}>
          <SafeAreaView style={styles.sheet}>

            <View style={styles.header}>
              <TouchableOpacity onPress={step === 'city' ? () => { setStep('state'); setSearch(''); } : close} style={styles.headerBtn}>
                <Text style={styles.headerBtnText}>{step === 'city' ? 'Back' : 'Close'}</Text>
              </TouchableOpacity>
              <Text style={styles.headerTitle}>
                {step === 'state' ? 'Select State' : selectedState}
              </Text>
              <View style={{ width: 60 }} />
            </View>

            <View style={styles.searchBar}>
              <TextInput
                style={styles.searchInput}
                placeholder={step === 'state' ? 'Search state...' : 'Search city...'}
                placeholderTextColor="#bbb"
                value={search}
                onChangeText={setSearch}
                autoCorrect={false}
              />
              {search.length > 0 && (
                <TouchableOpacity onPress={() => setSearch('')} style={styles.clearBtn}>
                  <Text style={styles.clearText}>x</Text>
                </TouchableOpacity>
              )}
            </View>

            {step === 'city' && (
              <TouchableOpacity style={styles.skipRow} onPress={skipCity}>
                <Text style={styles.skipText}>All of {selectedState}</Text>
                <Text style={styles.skipSub}>No specific city</Text>
              </TouchableOpacity>
            )}

            <FlatList
              data={list}
              keyExtractor={item => item}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={<Text style={styles.empty}>No results for "{search}"</Text>}
              renderItem={({ item }) => {
                const active = (step === 'state' ? selectedState : selectedCity) === item;
                return (
                  <TouchableOpacity
                    style={[styles.row, active && styles.rowActive]}
                    onPress={() => step === 'state' ? selectState(item) : selectCity(item)}
                    activeOpacity={0.65}
                  >
                    <Text style={[styles.rowText, active && styles.rowTextActive]}>{item}</Text>
                    {active && <Text style={styles.check}>done</Text>}
                  </TouchableOpacity>
                );
              }}
            />
          </SafeAreaView>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8F6F3',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  triggerText: { color: '#1A1A1A', fontSize: 15, flex: 1, fontWeight: '500' },
  placeholder: { color: '#C0BDBA' },
  chevron: { color: '#999', fontSize: 12, fontWeight: '700', marginLeft: 8 },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: height * 0.82,
    minHeight: height * 0.55,
    paddingBottom: 20,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0EDE8',
  },
  headerBtn: { width: 60 },
  headerBtnText: { color: '#FF4F5A', fontSize: 14, fontWeight: '700' },
  headerTitle: { fontSize: 16, fontWeight: '800', color: '#1A1A1A', textAlign: 'center', flex: 1 },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F4F2EF',
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 12,
    paddingHorizontal: 14,
  },
  searchInput: { flex: 1, fontSize: 15, color: '#1A1A1A', paddingVertical: 12 },
  clearBtn: { padding: 4 },
  clearText: { color: '#bbb', fontSize: 13, fontWeight: '700' },

  skipRow: {
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 14,
    backgroundColor: '#FFF0F0',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFD6D9',
  },
  skipText: { color: '#FF4F5A', fontSize: 14, fontWeight: '700' },
  skipSub: { color: '#FF8A90', fontSize: 12, marginTop: 2 },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F8F6F3',
  },
  rowActive: { backgroundColor: '#FFF8F8' },
  rowText: { color: '#1A1A1A', fontSize: 15 },
  rowTextActive: { color: '#FF4F5A', fontWeight: '700' },
  check: { color: '#FF4F5A', fontSize: 12, fontWeight: '800' },

  empty: { color: '#bbb', textAlign: 'center', marginTop: 40, fontSize: 14 },
});
