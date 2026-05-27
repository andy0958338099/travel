'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getCharacters, getCharacterDiaries } from '@/lib/api';

interface Character {
  id: number;
  character_number: string;
  name: string;
  gender: string;
  description?: string;
  diary_count?: number;
  image_path?: string;
  core_features?: string;
}
interface Diary {
  id: number;
  character_id: number;
  title: string;
  content: string;
  mood: string;
  weather?: string;
  location?: string;
  tags: string[];
  is_published?: number;
  created_at: string;
}

const characterDetails = [
  {
    id: 1, number: 'C001', name: '沈予曦', gender: 'female',
    age: 24, job: '獨立雜誌《日常標點》編輯',
    personality: '敏感細膩，外表柔和內心固執。文字是她最好的武器，對愛情既期待又恐懼。',
    secret: '有輕微焦慮症，暗戀著攝影師季允辰',
    quote: '「我習慣把不敢說的話寫下來，總有一天，會有人替我讀給她聽。」'
  },
  {
    id: 8, number: 'C002', name: '周敘明', gender: 'male',
    age: 25, job: '健身教練 / 兼職游泳教練',
    personality: '陽光正向，頭腦簡單但不笨。很容易喜歡上一個人，暗戀時會變得笨拙。',
    secret: '暗戀簡怡然，覺得自己配不上「讀書人」',
    quote: '「我可能不懂很多事，但懂怎麼讓自己的身體變強。」'
  },
  {
    id: 3, number: 'C003', name: '簡怡然', gender: 'female',
    age: 23, job: '健身教練 / 運動網紅',
    personality: '正能量爆棚，行動力超強。義氣十足的閨蜜，說話直接不拐彎抹角。',
    secret: '高中曾因身材被霸凌，害怕安靜下來的自己',
    quote: '「流汗的時候，就沒時間想那些有的沒的了。」'
  },
  {
    id: 4, number: 'C004', name: '姜以甯', gender: 'female',
    age: 20, job: '練習生（偶像團體預備出道）',
    personality: '永遠元氣滿滿，極度努力家。鏡頭前完美，私下會突然放空。',
    secret: '暗戀攝影師季允辰，有輕微失眠問題',
    quote: '「我要讓所有支持我的人看到，就算不是天才，努力也可以閃閃發光。」'
  },
  {
    id: 5, number: 'C005', name: '陸思珩', gender: 'female',
    age: 28, job: '精品公關 / 活動公司副總',
    personality: '做事高效果斷，不拖泥帶水。表面高冷，內心柔軟，保護摯友時變身俠女。',
    secret: '有恐慌症，父親離世後一直用工作麻痺自己',
    quote: '「我不怕，只怕自己變成當年來不及救爸的那個人。」'
  },
  {
    id: 6, number: 'C006', name: '溫芯蕾', gender: 'female',
    age: 26, job: '「離題」咖啡廳老闆',
    personality: '脾氣極好，傾聽者類型。做生意很精明但表面很從容，害怕衝突但不懦弱。',
    secret: '暗戀沈予曦，類風濕性關節炎患者',
    quote: '「我喜歡看別人開心的樣子，那讓我覺得自己也有被需要。」'
  },
  {
    id: 7, number: 'C007', name: '季允辰', gender: 'male',
    age: 27, job: '自由攝影師',
    personality: '溫柔到像沒有脾氣，善於傾聽，是朋友的最佳樹洞。有原則但很少表現出來。',
    secret: '有一段深刻的初戀，收集了很多笑容卻很少笑',
    quote: '「每個人的臉都是一本故事書，我只是那個翻頁的人。」'
  },
];

const relationships = [
  { from: '沈予曦', to: '季允辰', type: '暗戀', desc: '工作合作中萌生的情愫' },
  { from: '姜以甯', to: '季允辰', type: '暗戀', desc: '徵選照片開啟的緣分' },
  { from: '溫芯蕾', to: '沈予曦', type: '暗戀', desc: '默默付出從不說出口' },
  { from: '周敘明', to: '簡怡然', type: '暗戀', desc: '被光環嚇退的單戀' },
  { from: '沈予曦', to: '簡怡然', type: '摯友', desc: '五年友誼，最信任的人' },
  { from: '簡怡然', to: '姜以甯', type: '友誼', desc: '健身教練與學員' },
  { from: '沈予曦', to: '溫芯蕾', type: '友誼', desc: '咖啡廳是第二個家' },
];

const timeline = [
  { date: '2024年3月', event: '春天 - 故事開始', detail: '《日常標點》「台中的她們」專題啟動' },
  { date: '2024年6月', event: '夏天 - 第一個大事件', detail: '雜誌專題截稿、甯的團體出道倒數' },
  { date: '2024年9月', event: '秋天 - 第二個大事件', detail: '怡然的過去被揭開、思珩恐慌症發作、敘明告白風波' },
  { date: '2024年12月', event: '冬天 - 第一季結局', detail: '每個人都必須做選擇，有人留下，有人離開' },
];

const locations = [
  { name: '離題咖啡館', area: '北區大明街', desc: '每個人的秘密基地，芯蕾的咖啡廳' },
  { name: '《日常標點》雜誌社', area: '西屯區商辦大樓', desc: '予曦工作的地方，夢想啟程點' },
  { name: 'Zone健身房', area: '北區', desc: '怡然與敘明的工作地點' },
  { name: '甯的宿舍', area: '南屯區', desc: '公司承租的四人套房，疲憊時的歸處' },
  { name: '允辰的暗房', area: '中區老屋', desc: '一樓工作室，二樓住家，到處是照片牆' },
  { name: '審計新村', area: '西區', desc: '藝術氣息，文創小店聚集地' },
];

const themes = [
  { emoji: '💕', title: '愛情的各種形態', desc: '初戀、暗戀、錯過、重逢' },
  { emoji: '💼', title: '職場與夢想', desc: '理想與現實的拉扯' },
  { emoji: '👭', title: '友情的深度', desc: '閨蜜、支持、競爭、誤會' },
  { emoji: '🌱', title: '自我的追尋', desc: '認同、成長、犧牲、選擇' },
];

export default function StoryBiblePage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [femaleDiaries, setFemaleDiaries] = useState<{ [key: number]: Diary[] }>({});
  const [characterImages, setCharacterImages] = useState<{ [key: number]: string }>({});

  useEffect(() => {
    loadDiaries();
    loadCharacterImages();
  }, []);

  const loadDiaries = async () => {
    const femaleIds = characterDetails.filter(c => c.gender === 'female').map(c => c.id);
    const diariesMap: { [key: number]: Diary[] } = {};
    for (const id of femaleIds) {
      try {
        const data = await getCharacterDiaries(id, 3, 0);
        if (data.diaries) {
          diariesMap[id] = data.diaries;
        }
      } catch (e) {
        console.error('載入日記失敗', e);
      }
    }
    setFemaleDiaries(diariesMap);
  };

  const loadCharacterImages = async () => {
    try {
      const chars = await getCharacters();
      const imagesMap: { [key: number]: string } = {};
      chars.forEach((char) => {
        if (char.image_path) {
          imagesMap[char.id] = char.image_path;
        }
      });
      setCharacterImages(imagesMap);
    } catch (e) {
      console.error('載入角色圖片失敗', e);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('zh-TW', { month: 'long', day: 'numeric' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 to-purple-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/characters" className="text-blue-500 hover:underline">
                ← 返回
              </Link>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">
                📖 台中心事 Story Bible
              </h1>
            </div>
            <Link
              href="/characters/diaries"
              className="bg-pink-500 text-white px-4 py-2 rounded-lg hover:bg-pink-600 transition text-sm"
            >
              📔 進入日記系統
            </Link>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex gap-1 overflow-x-auto">
            {[
              { id: 'overview', label: '總覽', emoji: '🏠' },
              { id: 'characters', label: '角色', emoji: '👥' },
              { id: 'relationships', label: '關係', emoji: '💕' },
              { id: 'timeline', label: '時間軸', emoji: '📅' },
              { id: 'world', label: '世界觀', emoji: '🗺️' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition ${
                  activeTab === tab.id
                    ? 'border-pink-500 text-pink-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab.emoji} {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Hero Section */}
            <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
              <h2 className="text-3xl font-bold mb-4">關於愛、工作、友情與成長的故事</h2>
              <p className="text-gray-600 max-w-2xl mx-auto mb-6">
                以台中市為舞台，串聯西屯、北區、中區、南屯、西區、逢甲。<br />
                七個角色、七種心事，在這座城市裡相遇、分離、成長。
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                {themes.map(t => (
                  <div key={t.title} className="bg-gray-50 rounded-full px-4 py-2 text-sm">
                    {t.emoji} {t.title}
                  </div>
                ))}
              </div>
            </div>

            {/* Theme Cards */}
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              {themes.map(t => (
                <div key={t.title} className="bg-white rounded-xl shadow p-4">
                  <div className="text-3xl mb-2">{t.emoji}</div>
                  <h3 className="font-bold mb-1">{t.title}</h3>
                  <p className="text-gray-500 text-sm">{t.desc}</p>
                </div>
              ))}
            </div>

            {/* Recent Diaries */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="text-xl font-bold mb-4">📝 最近的日記</h3>
              <div className="space-y-4">
                {characterDetails.filter(c => c.gender === 'female').slice(0, 3).map(char => {
                  const diaries = femaleDiaries[char.id] || [];
                  return diaries.slice(0, 1).map(diary => (
                    <div key={diary.id} className="border-l-4 border-pink-400 pl-4 py-2">
                      <div className="flex items-center gap-2 mb-1">
                        {/* Character mini avatar */}
                        {characterImages[char.id] && (
                          <img
                            src={characterImages[char.id]}
                            alt={char.name}
                            className="w-6 h-6 rounded-full object-cover"
                          />
                        )}
                        <span className="font-medium">{char.name}</span>
                        <span className="text-sm text-gray-400">·</span>
                        <span className="text-sm text-gray-500">{formatDate(diary.created_at)}</span>
                      </div>
                      <h4 className="font-bold">{diary.title}</h4>
                      <p className="text-gray-600 text-sm line-clamp-2">{diary.content}</p>
                    </div>
                  ));
                })}
              </div>
            </div>
          </div>
        )}

        {/* Characters Tab */}
        {activeTab === 'characters' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">👥 角色設定</h2>
            <div className="grid md:grid-cols-2 gap-6">
              {characterDetails.map(char => (
                <div
                  key={char.id}
                  className={`bg-white rounded-2xl shadow-lg overflow-hidden ${
                    char.gender === 'male' ? 'border-2 border-blue-100' : 'border-2 border-pink-100'
                  }`}
                >
                  {/* Header */}
                  <div className={`px-6 py-4 flex items-center gap-4 ${
                    char.gender === 'male' ? 'bg-blue-50' : 'bg-pink-50'
                  }`}>
                    {/* Character Avatar */}
                    <div className="flex-shrink-0">
                      {characterImages[char.id] ? (
                        <img
                          src={characterImages[char.id]}
                          alt={char.name}
                          className="w-16 h-16 rounded-full object-cover border-2 border-white shadow-md"
                        />
                      ) : (
                        <div className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl border-2 border-white shadow-md ${
                          char.gender === 'male' ? 'bg-blue-200' : 'bg-pink-200'
                        }`}>
                          {char.gender === 'male' ? '👨' : '👩'}
                        </div>
                      )}
                    </div>
                    <div>
                      <span className="text-xs font-mono text-gray-500">{char.number}</span>
                      <h3 className="text-xl font-bold">{char.name}</h3>
                      <p className="text-sm text-gray-600 mt-0.5">{char.job}</p>
                    </div>
                  </div>

                  {/* Body */}
                  <div className="p-6 space-y-4">
                    <div>
                      <span className="text-xs font-bold text-gray-400 uppercase">年齡</span>
                      <p className="text-gray-800">{char.age}歲</p>
                    </div>
                    <div>
                      <span className="text-xs font-bold text-gray-400 uppercase">性格</span>
                      <p className="text-gray-800 text-sm">{char.personality}</p>
                    </div>
                    <div>
                      <span className="text-xs font-bold text-gray-400 uppercase">秘密</span>
                      <p className="text-gray-600 text-sm italic">{char.secret}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <span className="text-xs font-bold text-gray-400">💬</span>
                      <p className="text-sm text-gray-700 italic">{char.quote}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Relationships Tab */}
        {activeTab === 'relationships' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">💕 角色關係圖</h2>

            {/* Love Lines */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="text-lg font-bold mb-4 text-pink-600">🥀 暗戀線</h3>
              <div className="grid md:grid-cols-2 gap-4">
                {relationships.filter(r => r.type === '暗戀').map((rel, i) => {
                  const fromChar = characterDetails.find(c => c.name === rel.from);
                  const toChar = characterDetails.find(c => c.name === rel.to);
                  return (
                    <div key={i} className="bg-pink-50 rounded-xl p-4">
                      <div className="flex items-center gap-3 mb-2">
                        {/* From avatar */}
                        <div className="flex-shrink-0">
                          {fromChar?.id && characterImages[fromChar.id] ? (
                            <img src={characterImages[fromChar.id]} alt={rel.from} className="w-8 h-8 rounded-full object-cover" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-pink-200 flex items-center justify-center text-sm">👤</div>
                          )}
                        </div>
                        <span className="font-bold">{rel.from}</span>
                        <span className="text-pink-400">♡</span>
                        {/* To avatar */}
                        <div className="flex-shrink-0">
                          {toChar?.id && characterImages[toChar.id] ? (
                            <img src={characterImages[toChar.id]} alt={rel.to} className="w-8 h-8 rounded-full object-cover" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-pink-200 flex items-center justify-center text-sm">👤</div>
                          )}
                        </div>
                        <span className="font-bold">{rel.to}</span>
                      </div>
                      <p className="text-gray-600 text-sm">{rel.desc}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Friendship Lines */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="text-lg font-bold mb-4 text-purple-600">🌸 友情線</h3>
              <div className="grid md:grid-cols-2 gap-4">
                {relationships.filter(r => r.type !== '暗戀').map((rel, i) => {
                  const fromChar = characterDetails.find(c => c.name === rel.from);
                  const toChar = characterDetails.find(c => c.name === rel.to);
                  return (
                    <div key={i} className="bg-purple-50 rounded-xl p-4">
                      <div className="flex items-center gap-3 mb-2">
                        {/* From avatar */}
                        <div className="flex-shrink-0">
                          {fromChar?.id && characterImages[fromChar.id] ? (
                            <img src={characterImages[fromChar.id]} alt={rel.from} className="w-8 h-8 rounded-full object-cover" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-purple-200 flex items-center justify-center text-sm">👤</div>
                          )}
                        </div>
                        <span className="font-bold">{rel.from}</span>
                        <span className="text-purple-400">↔</span>
                        {/* To avatar */}
                        <div className="flex-shrink-0">
                          {toChar?.id && characterImages[toChar.id] ? (
                            <img src={characterImages[toChar.id]} alt={rel.to} className="w-8 h-8 rounded-full object-cover" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-purple-200 flex items-center justify-center text-sm">👤</div>
                          )}
                        </div>
                        <span className="font-bold">{rel.to}</span>
                      </div>
                      <p className="text-gray-600 text-sm">{rel.desc}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Visual Map */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="text-lg font-bold mb-4">🗺️ 關係視覺圖</h3>
              <div className="flex flex-wrap justify-center gap-4 items-center">
                {(() => {
                  const charMap: { [key: string]: { char: typeof characterDetails[0], imageSrc: string } | undefined } = {};
                  characterDetails.forEach(c => {
                    charMap[c.name] = { char: c, imageSrc: characterImages[c.id] || '' };
                  });
                  const mapChars = [
                    { name: '沈予曦', bg: 'pink' },
                    { name: '季允辰', bg: 'blue' },
                    { name: '姜以甯', bg: 'pink' },
                  ];
                  return mapChars.map((item) => {
                    const info = charMap[item.name];
                    const avatar = info?.imageSrc;
                    return (
                      <div key={item.name} className="text-center">
                        <div className={`rounded-full w-20 h-20 flex items-center justify-center mb-2 overflow-hidden border-2 ${
                          item.bg === 'pink' ? 'border-pink-300 bg-pink-100' : 'border-blue-300 bg-blue-100'
                        }`}>
                          {avatar ? (
                            <img src={avatar} alt={item.name} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-sm font-bold">{item.name}<br/>{info?.char?.number}</span>
                          )}
                        </div>
                        <span className="text-xs text-gray-500">{item.name}</span>
                      </div>
                    );
                  });
                })()}
                <div className="text-gray-300 text-2xl mx-2">|</div>
                <div className="text-center">
                  <div className="bg-pink-100 rounded-full w-20 h-20 flex items-center justify-center mb-2 overflow-hidden border-2 border-pink-300">
                    {(() => {
                      const c = characterDetails.find(x => x.name === '姜以甯');
                      return c && characterImages[c.id]
                        ? <img src={characterImages[c.id]} alt="姜以甯" className="w-full h-full object-cover" />
                        : <span className="text-sm font-bold">姜以甯<br/>C004</span>;
                    })()}
                  </div>
                  <span className="text-xs text-gray-500">姜以甯</span>
                </div>
                <div className="text-pink-400 text-2xl">♡</div>
                <div className="text-center">
                  <div className="bg-blue-100 rounded-full w-20 h-20 flex items-center justify-center mb-2 overflow-hidden border-2 border-blue-300">
                    {(() => {
                      const c = characterDetails.find(x => x.name === '季允辰');
                      return c && characterImages[c.id]
                        ? <img src={characterImages[c.id]} alt="季允辰" className="w-full h-full object-cover" />
                        : <span className="text-sm font-bold">季允辰<br/>C007</span>;
                    })()}
                  </div>
                  <span className="text-xs text-gray-500">季允辰</span>
                </div>
              </div>
              <div className="text-center mt-4 text-gray-500 text-sm">
                <p>※ 粉色＝女性角色 / 藍色＝男性角色</p>
              </div>
            </div>
          </div>
        )}

        {/* Timeline Tab */}
        {activeTab === 'timeline' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">📅 故事時間軸</h2>

            <div className="relative">
              {/* Timeline Line */}
              <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gradient-to-b from-pink-400 via-purple-400 to-blue-400" />

              {/* Timeline Items */}
              <div className="space-y-8">
                {timeline.map((item, i) => (
                  <div key={i} className="relative flex gap-6">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white border-4 border-pink-400 flex items-center justify-center z-10">
                      <span className="text-xs">{i + 1}</span>
                    </div>
                    <div className="flex-1 bg-white rounded-2xl shadow-lg p-6">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-sm font-mono text-pink-600">{item.date}</span>
                        <span className="bg-pink-100 text-pink-700 text-xs px-2 py-1 rounded-full">
                          {item.event}
                        </span>
                      </div>
                      <p className="text-gray-600">{item.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Season Themes */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="text-lg font-bold mb-4">🎭 核心問題（每季討論）</h3>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="bg-spring-50 rounded-xl p-4 text-center">
                  <div className="text-3xl mb-2">🌱</div>
                  <h4 className="font-bold mb-1">第一季</h4>
                  <p className="text-gray-600 text-sm">我是誰？<br/><span className="text-gray-400">（身份認同）</span></p>
                </div>
                <div className="bg-summer-50 rounded-xl p-4 text-center">
                  <div className="text-3xl mb-2">☀️</div>
                  <h4 className="font-bold mb-1">第二季</h4>
                  <p className="text-gray-600 text-sm">我想要什麼？<br/><span className="text-gray-400">（欲望與恐懼）</span></p>
                </div>
                <div className="bg-autumn-50 rounded-xl p-4 text-center">
                  <div className="text-3xl mb-2">🍂</div>
                  <h4 className="font-bold mb-1">第三季</h4>
                  <p className="text-gray-600 text-sm">我願意犧牲什麼？<br/><span className="text-gray-400">（抉擇與代價）</span></p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* World Tab */}
        {activeTab === 'world' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">🗺️ 世界觀設定</h2>

            {/* Locations */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="text-lg font-bold mb-4">📍 故事舞台（台中各區）</h3>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {locations.map((loc, i) => (
                  <div key={i} className="bg-gray-50 rounded-xl p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-bold">{loc.name}</h4>
                    </div>
                    <p className="text-xs text-pink-600 mb-1">📍 {loc.area}</p>
                    <p className="text-gray-600 text-sm">{loc.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Culture Symbols */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="text-lg font-bold mb-4">🎨 文化符號</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { emoji: '🧋', title: '手搖杯', desc: '每個角色都有自己愛喝的' },
                  { emoji: '🏍️', title: '騎機車', desc: '台中特有的生活方式' },
                  { emoji: '🍲', title: '半夜的火鍋', desc: '友情的催化劑' },
                  { emoji: '💬', title: '已讀不回', desc: '心碎的起點' },
                ].map((item, i) => (
                  <div key={i} className="bg-amber-50 rounded-xl p-4 text-center">
                    <div className="text-3xl mb-2">{item.emoji}</div>
                    <h4 className="font-bold text-sm">{item.title}</h4>
                    <p className="text-gray-600 text-xs">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Narrative Style */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="text-lg font-bold mb-4">✍️ 敘事風格</h3>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-bold text-purple-600 mb-2">影像風格</h4>
                  <p className="text-gray-600 text-sm">參考：日劇《大豆田》的日常感</p>
                  <ul className="text-gray-600 text-sm mt-2 space-y-1">
                    <li>• 色調：溫暖的黃與藍</li>
                    <li>• 拍攝：手持鏡頭、詩意空鏡</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-bold text-pink-600 mb-2">文字風格</h4>
                  <ul className="text-gray-600 text-sm space-y-1">
                    <li>• 對話：自然，帶有口頭禪</li>
                    <li>• 內心獨白：散文詩意的第一人稱</li>
                    <li>• 日記文體：破碎但真實的思緒</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
