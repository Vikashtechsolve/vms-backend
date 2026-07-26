/**
 * Canonical India state -> city list.
 * This is the single source of truth for trainer locations: the admin panel and
 * the public site both read it from `GET /api/locations`, so a city can only be
 * stored using the exact spelling listed here.
 */
export const INDIA_LOCATIONS = [
  {
    state: 'Andaman and Nicobar Islands',
    cities: ['Port Blair'],
  },
  {
    state: 'Andhra Pradesh',
    cities: [
      'Anantapur', 'Chittoor', 'Eluru', 'Guntur', 'Kadapa', 'Kakinada', 'Kurnool',
      'Nellore', 'Ongole', 'Rajahmundry', 'Srikakulam', 'Tirupati', 'Vijayawada',
      'Visakhapatnam', 'Vizianagaram',
    ],
  },
  {
    state: 'Arunachal Pradesh',
    cities: ['Itanagar', 'Naharlagun', 'Pasighat', 'Tawang'],
  },
  {
    state: 'Assam',
    cities: [
      'Dibrugarh', 'Dispur', 'Guwahati', 'Jorhat', 'Nagaon', 'Silchar', 'Tezpur', 'Tinsukia',
    ],
  },
  {
    state: 'Bihar',
    cities: [
      'Ara', 'Begusarai', 'Bhagalpur', 'Bihar Sharif', 'Chhapra', 'Darbhanga', 'Gaya',
      'Katihar', 'Munger', 'Muzaffarpur', 'Patna', 'Purnia', 'Saharsa', 'Sasaram',
    ],
  },
  {
    state: 'Chandigarh',
    cities: ['Chandigarh'],
  },
  {
    state: 'Chhattisgarh',
    cities: [
      'Ambikapur', 'Bhilai', 'Bilaspur', 'Durg', 'Jagdalpur', 'Korba', 'Raigarh', 'Raipur', 'Rajnandgaon',
    ],
  },
  {
    state: 'Dadra and Nagar Haveli and Daman and Diu',
    cities: ['Daman', 'Diu', 'Silvassa'],
  },
  {
    state: 'Delhi',
    cities: [
      'Central Delhi', 'Delhi', 'Dwarka', 'East Delhi', 'New Delhi', 'North Delhi',
      'Rohini', 'Saket', 'South Delhi', 'West Delhi',
    ],
  },
  {
    state: 'Goa',
    cities: ['Mapusa', 'Margao', 'Panaji', 'Ponda', 'Vasco da Gama'],
  },
  {
    state: 'Gujarat',
    cities: [
      'Ahmedabad', 'Anand', 'Bharuch', 'Bhavnagar', 'Bhuj', 'Gandhidham', 'Gandhinagar',
      'Jamnagar', 'Junagadh', 'Mehsana', 'Morbi', 'Nadiad', 'Navsari', 'Palanpur',
      'Patan', 'Porbandar', 'Rajkot', 'Surat', 'Surendranagar', 'Vadodara', 'Valsad', 'Vapi', 'Veraval',
    ],
  },
  {
    state: 'Haryana',
    cities: [
      'Ambala', 'Bahadurgarh', 'Bhiwani', 'Faridabad', 'Gurugram', 'Hisar', 'Karnal',
      'Kurukshetra', 'Panipat', 'Rewari', 'Rohtak', 'Sirsa', 'Sonipat', 'Yamunanagar',
    ],
  },
  {
    state: 'Himachal Pradesh',
    cities: ['Dharamshala', 'Kullu', 'Manali', 'Mandi', 'Shimla', 'Solan', 'Una'],
  },
  {
    state: 'Jammu and Kashmir',
    cities: ['Anantnag', 'Baramulla', 'Jammu', 'Srinagar', 'Udhampur'],
  },
  {
    state: 'Jharkhand',
    cities: [
      'Bokaro Steel City', 'Deoghar', 'Dhanbad', 'Giridih', 'Hazaribagh', 'Jamshedpur', 'Ramgarh', 'Ranchi',
    ],
  },
  {
    state: 'Karnataka',
    cities: [
      'Ballari', 'Belagavi', 'Bengaluru', 'Bidar', 'Chikkamagaluru', 'Davanagere',
      'Dharwad', 'Gulbarga', 'Hassan', 'Hubballi', 'Mangaluru', 'Mysuru', 'Raichur',
      'Shivamogga', 'Tumakuru', 'Udupi', 'Vijayapura',
    ],
  },
  {
    state: 'Kerala',
    cities: [
      'Alappuzha', 'Kannur', 'Kochi', 'Kollam', 'Kottayam', 'Kozhikode', 'Malappuram',
      'Palakkad', 'Pathanamthitta', 'Thrissur', 'Thiruvananthapuram',
    ],
  },
  {
    state: 'Ladakh',
    cities: ['Kargil', 'Leh'],
  },
  {
    state: 'Lakshadweep',
    cities: ['Kavaratti'],
  },
  {
    state: 'Madhya Pradesh',
    cities: [
      'Bhopal', 'Burhanpur', 'Chhindwara', 'Dewas', 'Gwalior', 'Indore', 'Jabalpur',
      'Katni', 'Khandwa', 'Ratlam', 'Rewa', 'Sagar', 'Satna', 'Singrauli', 'Ujjain', 'Vidisha',
    ],
  },
  {
    state: 'Maharashtra',
    cities: [
      'Ahmednagar', 'Akola', 'Amravati', 'Aurangabad', 'Chandrapur', 'Dhule', 'Jalgaon',
      'Kalyan', 'Kolhapur', 'Latur', 'Mumbai', 'Nagpur', 'Nanded', 'Nashik', 'Navi Mumbai',
      'Palghar', 'Panvel', 'Pune', 'Sangli', 'Satara', 'Solapur', 'Thane', 'Vasai-Virar', 'Wardha',
    ],
  },
  {
    state: 'Manipur',
    cities: ['Imphal', 'Thoubal'],
  },
  {
    state: 'Meghalaya',
    cities: ['Shillong', 'Tura'],
  },
  {
    state: 'Mizoram',
    cities: ['Aizawl', 'Lunglei'],
  },
  {
    state: 'Nagaland',
    cities: ['Dimapur', 'Kohima', 'Mokokchung'],
  },
  {
    state: 'Odisha',
    cities: [
      'Balasore', 'Berhampur', 'Bhubaneswar', 'Cuttack', 'Puri', 'Rourkela', 'Sambalpur',
    ],
  },
  {
    state: 'Puducherry',
    cities: ['Karaikal', 'Puducherry', 'Yanam'],
  },
  {
    state: 'Punjab',
    cities: [
      'Amritsar', 'Bathinda', 'Fazilka', 'Firozpur', 'Hoshiarpur', 'Jalandhar',
      'Ludhiana', 'Mohali', 'Moga', 'Pathankot', 'Patiala', 'Phagwara',
    ],
  },
  {
    state: 'Rajasthan',
    cities: [
      'Ajmer', 'Alwar', 'Bharatpur', 'Bhilwara', 'Bikaner', 'Chittorgarh', 'Jaipur',
      'Jaisalmer', 'Jhunjhunu', 'Jodhpur', 'Kota', 'Pali', 'Sikar', 'Udaipur',
    ],
  },
  {
    state: 'Sikkim',
    cities: ['Gangtok', 'Namchi'],
  },
  {
    state: 'Tamil Nadu',
    cities: [
      'Chennai', 'Coimbatore', 'Cuddalore', 'Dindigul', 'Erode', 'Hosur', 'Kanchipuram',
      'Karur', 'Madurai', 'Nagercoil', 'Namakkal', 'Salem', 'Thanjavur', 'Thoothukudi',
      'Tiruchirappalli', 'Tirunelveli', 'Tiruppur', 'Vellore',
    ],
  },
  {
    state: 'Telangana',
    cities: [
      'Adilabad', 'Hyderabad', 'Karimnagar', 'Khammam', 'Mahbubnagar', 'Nalgonda',
      'Nizamabad', 'Ramagundam', 'Secunderabad', 'Warangal',
    ],
  },
  {
    state: 'Tripura',
    cities: ['Agartala', 'Udaipur (Tripura)'],
  },
  {
    state: 'Uttar Pradesh',
    cities: [
      'Agra', 'Aligarh', 'Prayagraj', 'Ayodhya', 'Bareilly', 'Firozabad', 'Ghaziabad',
      'Gorakhpur', 'Jhansi', 'Kanpur', 'Lucknow', 'Mathura', 'Meerut', 'Moradabad',
      'Muzaffarnagar', 'Noida', 'Greater Noida', 'Rampur', 'Saharanpur', 'Varanasi',
    ],
  },
  {
    state: 'Uttarakhand',
    cities: [
      'Dehradun', 'Haldwani', 'Haridwar', 'Kashipur', 'Nainital', 'Rishikesh', 'Roorkee', 'Rudrapur',
    ],
  },
  {
    state: 'West Bengal',
    cities: [
      'Asansol', 'Bardhaman', 'Darjeeling', 'Durgapur', 'Haldia', 'Howrah', 'Kharagpur',
      'Kolkata', 'Malda', 'Siliguri',
    ],
  },
  {
    state: 'Other',
    cities: ['Outside India', 'Remote / Work From Home'],
  },
]

/**
 * Legacy spellings seen in older free-text records, mapped to the canonical city.
 * Used only to upgrade existing data on save — new entries always come from the picker.
 */
export const LEGACY_CITY_ALIASES = {
  bangalore: 'Bengaluru',
  banglore: 'Bengaluru',
  bengaluru: 'Bengaluru',
  blr: 'Bengaluru',
  bombay: 'Mumbai',
  calcutta: 'Kolkata',
  madras: 'Chennai',
  poona: 'Pune',
  baroda: 'Vadodara',
  trivandrum: 'Thiruvananthapuram',
  cochin: 'Kochi',
  calicut: 'Kozhikode',
  mysore: 'Mysuru',
  mangalore: 'Mangaluru',
  hubli: 'Hubballi',
  belgaum: 'Belagavi',
  gurgaon: 'Gurugram',
  allahabad: 'Prayagraj',
  pondicherry: 'Puducherry',
  vizag: 'Visakhapatnam',
  hyd: 'Hyderabad',
  ncr: 'New Delhi',
  gandhinagr: 'Gandhinagar',
}
