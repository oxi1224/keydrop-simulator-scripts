# Keydrop-Website skrypty pomocne (PRACE ZAPRZESTANE)
## Lista zawartości
 - [Instalacja](#markdown-header-instalacja)
 - [Użytkowanie](#markdown-header-użytkowanie)
## Instalacja
Aby rozpocząć używanie programu należy pobrać najnowszą wersję LTS programu node.js oraz najnowszą wersję PostgreSQL.
- [Node.js](https://nodejs.org/en)
- [PostgreSQL](https://www.postgresql.org/)
## Użytkowanie
> JEDYNIE DZIAŁA PLIK **restore.js**

Zanim zaczniesz
- Pobierz wszystkie pliki i wypakuj do osobnego folderu
- Stwórz nową bazę danych PostgreSQL. [Poradnik](https://www.youtube.com/watch?v=Fb2UHQJMsYQ)
- Upewnij się, że program Node.js działa poprawnie poprzez komendę ``node --version``. Powinno się pokazać zainstalowana wersja, np.
```bash
C:\>node --version
v20.10.0
```
- stwórz plik ``.env`` w folderze głównym aplikacjii uzpełnij go w następujący sposób:
```.env
DATABASE_URL = "LINK_TUTAJ"
```
- Jeżeli uruchamiasz aplikację po raz pierwszy należy wpisać następujące komendy:
```bash
npm install
npx prisma generate
npx prisma db push
```
- Aby uruchomić dany skrypt, należy użyć polecenia ``node nazwa_pliku.js``


#### **restore.js**
Ten skrypt doda do bazy danych wszystkie skrzynki z folderu ``output/cases-backup``

#### **~~index.js~~**
Skrypt aktualnie nie działa.\
Skrypt który uruchomi przeglądarke sterowaną automatycznie, należy zalogować się na stronę keydrop i uruchomić skrypt ponownie. Wtedy skrypt zacznie aktualizować dane w bazie danych z najnowszymi prosto ze stroy.

