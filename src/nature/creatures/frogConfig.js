export const FROG_CONFIG = Object.freeze({
  id: 'taiwan-tree-frog',
  name: '面天樹蛙',
  scientificName: 'Kurixalus idiootocus',
  category: '兩棲類',
  icon: '🐸',
  shortDescription: '面天樹蛙是臺灣特有的小型樹蛙，背部常有深色的 X 或 H 形斑紋。',
  habitat: '常見於臺灣西半部中低海拔山區，喜歡潮濕的灌叢、草叢陰濕處與池塘邊。',
  funFact: '牠的體色多為褐色，趾端有吸盤，能幫助牠攀附植物。',
  image: '',
  photoSource: '',
  photoCredit: '',
  source: 'https://iesn.tfri.gov.tw/News_ContentFrogs.aspx?c4=%E6%A8%B9%E8%9B%99%E7%A7%91&n=7775&s=20101',
  dataSources: Object.freeze([
    Object.freeze({
      name: '林業試驗所長期生態研究資訊平台：面天樹蛙',
      url: 'https://iesn.tfri.gov.tw/News_ContentFrogs.aspx?c4=%E6%A8%B9%E8%9B%99%E7%A7%91&n=7775&s=20101',
    }),
    Object.freeze({
      name: '林業及自然保育署：兩棲爬蟲類名錄',
      url: 'https://conservation.forest.gov.tw/File.aspx?fno=85736',
    }),
    Object.freeze({
      name: '林業及自然保育署：兩棲類監測標準作業手冊',
      url: 'https://conservation.forest.gov.tw/File.aspx?fno=89337',
    }),
  ]),
  hopRadius: 0.42,
  hopInterval: Object.freeze({ min: 2.8, max: 5.2 }),
  interactionDistance: 2.4,
});
