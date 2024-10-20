import React, { useState, useEffect } from 'react';
import { Text, View, StyleSheet, Button, ActivityIndicator, FlatList,TextInput } from 'react-native';
import { BarCodeScanner } from 'expo-barcode-scanner';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import app from './firebaseConfig';
import { getDatabase, ref, onValue, set, push } from 'firebase/database';
import Icon from 'react-native-vector-icons/Ionicons';
import RNPickerSelect from 'react-native-picker-select';

const Tab = createBottomTabNavigator();

const DISCOGS_API_URL = 'https://api.discogs.com/';
const DISCOGS_TOKEN = 'rdsYGyNtIsWfEQomrpnfffyLwAosjvgmpzMjGADw'; // Substitua pelo seu token

// Tela de Leitura
function LeituraScreen() {
  const [hasPermission, setHasPermission] = useState(null);
  const [scanned, setScanned] = useState(false);
  const [scannedData, setScannedData] = useState('');
  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState([]);

  useEffect(() => {
    (async () => {
      const { status } = await BarCodeScanner.requestPermissionsAsync();
      setHasPermission(status === 'granted');
    })();

    const db = getDatabase();
    const dbRef = ref(db, 'music/record');

    const unsubscribe = onValue(dbRef, (snapshot) => {
      const data = snapshot.val();
      const recordsArray = data ? Object.values(data) : [];
      setRecords(recordsArray);
    });

    return () => unsubscribe();
  }, []);

  const handleBarCodeScanned = async ({ type, data }) => {
    setScanned(true);
    setScannedData(data);
    setLoading(true);

    const barcodeExists = records.some(record => record.barcode === data);
    if (barcodeExists) {
      alert('O artigo já foi inserido.');
      setLoading(false);
      return;
    }

    const albumData = await fetchAlbumInfo(data);
    if (albumData) {
      await addAlbumToDatabase(data, albumData);
    }
    setLoading(false);
  };

  const fetchAlbumInfo = async (barcode) => {
    setLoading(true);
    try {
      const response = await fetch(`${DISCOGS_API_URL}database/search?q=${barcode}&type=release&token=${DISCOGS_TOKEN}`);
      const result = await response.json();
      if (result.results && result.results.length > 0) {
        return {
          title: result.results[0].title || 'N/A',
          year: result.results[0].year || 'N/A',
          style: result.results[0].style[0] || 'N/A ',
          format: result.results[0].formats[0].name || 'N/A',
        };
      } else {
        alert('Álbum não encontrado');
      }
    } catch (error) {
      console.error('Erro ao buscar álbum:', error);
    } finally {
      setLoading(false);
    }
  };

  const addAlbumToDatabase = async (barcode, albumData ) => {
    const db = getDatabase(app);
    const albumRef = push(ref(db, "music/record"));
    
    console.log(albumData);

    const artist = albumData.title.split('-')[0].trim();
    const title = albumData.title;
    const year = albumData.year;
    const format = albumData.format;
    const style = albumData.style;
    
    
    set(albumRef, { barcode,artist, title, format, year, style })
      .then(() => {
        alert(`Álbum ${title} adicionado com sucesso!`);
      })
      .catch((error) => {
        console.log('Erro ao adicionar álbum:', error);
      });
  };

  if (hasPermission === null) {
    return <Text>Solicitando permissão para a câmera...</Text>;
  }
  if (hasPermission === false) {
    return <Text>Sem acesso à câmera.</Text>;
  }

  return (
    <View style={styles.container}>
      <BarCodeScanner
        onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
        style={StyleSheet.absoluteFillObject}
      />
      {scanned && (
        <View style={styles.bottomView}>
          <Button title={'Ler novamente'} onPress={() => setScanned(false)} />
        </View>
      )}
      {loading && <ActivityIndicator size="large" color="#0000ff" />}
    </View>
  );
}

// Tela de Lista (temporariamente em branco)
function ListaScreen() {
  const [records, setRecords] = useState([]); // Estado para armazenar os registros
  const [searchQuery, setSearchQuery] = useState(''); // Estado para armazenar a consulta de pesquisa
  const [artistFilter, setArtistFilter] = useState(''); // Estado para armazenar o artista selecionado
  const [artists, setArtists] = useState([]); // Estado para armazenar a lista de artistas únicos

  useEffect(() => {
    const db = getDatabase();
    const dbRef = ref(db, 'music/record');

    const unsubscribe = onValue(dbRef, (snapshot) => {
      const data = snapshot.val();
      const recordsArray = data ? Object.values(data) : [];

      // Ordenar os registros por título
      recordsArray.sort((a, b) => a.title.localeCompare(b.title));
      
      // Extrair uma lista única de artistas para o dropdown
      const uniqueArtists = [...new Set(recordsArray.map(record => record.artist))];
      setArtists(uniqueArtists); // Atualiza a lista de artistas

      setRecords(recordsArray); // Atualiza o estado dos registros
    });

    return () => unsubscribe();
  }, []);

  // Filtrar registros com base na consulta de pesquisa e no artista selecionado
  const filteredRecords = records.filter(record => 
    record.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
    (artistFilter === '' || record.artist === artistFilter)
  );

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.searchInput}
        placeholder="Pesquisar por título..."
        value={searchQuery}
        onChangeText={setSearchQuery} // Atualiza a consulta de pesquisa
      />

      <RNPickerSelect
        onValueChange={(value) => setArtistFilter(value)} // Atualiza o filtro de artista
        placeholder={{ label: 'Filtrar por artista', value: '' }} // Placeholder do dropdown
        items={artists.map(artist => ({ label: artist, value: artist }))} // Mapeia artistas para o dropdown
        style={pickerSelectStyles}
      />

      <FlatList
        data={filteredRecords} // Usa os registros filtrados
        keyExtractor={(item) => item.barcode}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <Text style={searchQuery && item.title.toLowerCase().includes(searchQuery.toLowerCase()) ? styles.highlightedTitle : styles.title}>
              {item.title}
            </Text>
            <Text>{item.year}</Text>
            <Text>{item.format}</Text>
            <Text>{item.style}</Text>
          </View>
        )}
      />
    </View>
  );
}

// Função principal App que configura a navegação
export default function App() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused, color, size }) => {
            let iconName;

            if (route.name === 'Scan') {
              iconName = focused ? 'barcode-outline' : 'barcode-sharp'; // Ícones para a tela de Scan
            } else if (route.name === 'Lista') {
              iconName = focused ? 'list-outline' : 'list-sharp'; // Ícones para a tela de Lista
            }

            // Retorna o ícone correspondente
            return <Icon name={iconName} size={size} color={color} />;
          },
          tabBarActiveTintColor: 'tomato',
          tabBarInactiveTintColor: 'gray',
        })}
      >
        <Tab.Screen name="Scan" component={LeituraScreen} />
        <Tab.Screen name="Lista" component={ListaScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}


// Estilos
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    padding: 20,
  },
  searchInput: {
    width: '100%',
    padding: 10,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 5,
    marginBottom: 20,
  },
  item: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
    width: '100%',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  highlightedTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    backgroundColor: '#ffd700', // Cor de fundo para destacar o título
  },
  bottomView: {
    position: 'absolute',
    bottom: 50,
    width: '100%',
    alignItems: 'center',
  } 
});

// Estilos do RNPickerSelect (Dropdown)
const pickerSelectStyles = {
  inputIOS: {
    fontSize: 16,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    color: 'black',
    paddingRight: 30, // para ícone no lado direito
    marginBottom: 20,
    width: '100%',
  },
  inputAndroid: {
    fontSize: 16,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    color: 'black',
    paddingRight: 30, // para ícone no lado direito
    marginBottom: 20,
    width: '100%',
  },
};