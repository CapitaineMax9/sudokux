// Le module `net` de Node n'est utilisé que dans les tests (l'app utilise
// react-native-tcp-socket) : on le déclare ici sans tirer les types de Node.
declare module 'node:net' {
  const net: unknown;
  export default net;
}
