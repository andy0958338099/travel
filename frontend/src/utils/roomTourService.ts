/**
 * Room Tour Supabase Service
 *
 * Strategy:
 *  - Load photos from Supabase first (per hotel_key)
 *  - Fall back to HOTELS hardcoded defaults if Supabase is empty
 *  - All mutations (add/delete/reorder) write to Supabase
 *  - All users see the same data after any change
 */

import { createClient } from '@/utils/supabase/client';

export interface Photo {
  id: string;
  src: string;
  caption: string;
  category: string;
  location: string;
}

// Hardcoded defaults (used as fallback when Supabase has no override)
const HOTELS_DEFAULT_PHOTOS: Record<string, Photo[]> = {
  shanghai: [
    { id: 's-1',  src: '/hotels/kingtown-plaza/shanghai/room_06.jpg',    caption: '豪華客房（60平方米景觀空間）',       category: 'room',     location: '8-15樓' },
    { id: 's-2',  src: '/hotels/kingtown-plaza/shanghai/room_07.jpg',    caption: '行政雙人床客房',                     category: 'room',     location: '12-18樓' },
    { id: 's-3',  src: '/hotels/kingtown-plaza/shanghai/room_08.jpg',    caption: '城市景觀客房（夜景）',               category: 'room',     location: '10-20樓' },
    { id: 's-4',  src: '/hotels/kingtown-plaza/shanghai/room_09.jpg',    caption: '商務客房（辦公區配置）',             category: 'room',     location: '5-12樓' },
    { id: 's-5',  src: '/hotels/kingtown-plaza/shanghai/room_10.jpg',    caption: '精緻雙床客房',                       category: 'room',     location: '6-14樓' },
    { id: 's-6',  src: '/hotels/kingtown-plaza/shanghai/room_11.jpg',    caption: '豪華套房臥室',                       category: 'room',     location: '16-22樓' },
    { id: 's-7',  src: '/hotels/kingtown-plaza/shanghai/room_12.jpg',    caption: '客房衛浴空間',                       category: 'room',     location: '全館' },
    { id: 's-8',  src: '/hotels/kingtown-plaza/shanghai/room_15.jpg',    caption: '精緻單人客房',                       category: 'room',     location: '3-8樓' },
    { id: 's-9',  src: '/hotels/kingtown-plaza/shanghai/room_20.jpg',    caption: '行政客房（加大床）',                 category: 'room',     location: '18-25樓' },
    { id: 's-10', src: '/hotels/kingtown-plaza/shanghai/room_new_02.jpg',caption: '豪華景觀客房',                       category: 'room',     location: '5樓' },
    { id: 's-11', src: '/hotels/kingtown-plaza/shanghai/room_new_03.jpg',caption: '商務客房',                           category: 'room',     location: '6樓' },
    { id: 's-12', src: '/hotels/kingtown-plaza/shanghai/room_new_09.jpg',caption: '行政套房',                           category: 'suite',    location: '12樓' },
    { id: 's-13', src: '/hotels/kingtown-plaza/shanghai/room_new_10.jpg',caption: '高級客房（加大床）',                 category: 'room',     location: '13樓' },
    { id: 's-14', src: '/hotels/kingtown-plaza/shanghai/room_new_11.jpg',caption: '精緻客房（mini bar）',                category: 'room',     location: '14樓' },
    { id: 's-15', src: '/hotels/kingtown-plaza/shanghai/room_new_12.jpg',caption: '豪華景觀套房',                       category: 'room',     location: '15樓' },
    { id: 's-16', src: '/hotels/kingtown-plaza/shanghai/room_new_13.jpg',caption: '商務套房（客廳）',                   category: 'suite',    location: '16樓' },
    { id: 's-17', src: '/hotels/kingtown-plaza/shanghai/room_new_14.jpg',caption: '舒適客房（隔音設計）',               category: 'room',     location: '17樓' },
    { id: 's-18', src: '/hotels/kingtown-plaza/shanghai/room_new_15.jpg',caption: '精緻客房（乾濕分離衛浴）',           category: 'room',     location: '18樓' },
    { id: 's-19', src: '/hotels/kingtown-plaza/shanghai/room_new_16.jpg',caption: '豪華客房（景觀）',                   category: 'room',     location: '19樓' },
    { id: 's-20', src: '/hotels/kingtown-plaza/shanghai/room_new_17.jpg',caption: '商務套房',                           category: 'suite',    location: '20樓' },
    { id: 's-21', src: '/hotels/kingtown-plaza/shanghai/room_suite_01.jpg',caption: '尊享套房（60平方米）',             category: 'suite',    location: '20-25樓' },
    { id: 's-22', src: '/hotels/kingtown-plaza/shanghai/room_suite_02.jpg',caption: '行政套房客廳',                     category: 'suite',    location: '20-25樓' },
    { id: 's-23', src: '/hotels/kingtown-plaza/shanghai/room_suite_03.jpg',caption: '尊享套房衛浴',                     category: 'suite',    location: '20-25樓' },
    { id: 's-24', src: '/hotels/kingtown-plaza/shanghai/room_suite_04.jpg',caption: '行政套房臥室',                     category: 'suite',    location: '20-25樓' },
    { id: 's-25', src: '/hotels/kingtown-plaza/shanghai/lobby_01.jpg',   caption: '酒店大堂（挑高三層）',               category: 'public',   location: '1樓' },
    { id: 's-26', src: '/hotels/kingtown-plaza/shanghai/lobby_02.jpg',   caption: '大堂休閒區',                       category: 'public',   location: '1樓' },
    { id: 's-27', src: '/hotels/kingtown-plaza/shanghai/corridor_01.jpg',caption: '高空走廊景觀',                      category: 'public',   location: '15樓' },
    { id: 's-28', src: '/hotels/kingtown-plaza/shanghai/restaurant_01.jpg',caption: '自助餐廳',                        category: 'dining',   location: '2樓' },
    { id: 's-29', src: '/hotels/kingtown-plaza/shanghai/gym_01.jpg',    caption: '健身中心',                          category: 'facility', location: '3樓' },
    { id: 's-30', src: '/hotels/kingtown-plaza/shanghai/room_new_20.jpg',caption: '精緻雙人客房',                      category: 'room',     location: '5樓' },
    { id: 's-31', src: '/hotels/kingtown-plaza/shanghai/room_new_21.jpg',caption: '商務客房',                          category: 'room',     location: '6樓' },
    { id: 's-32', src: '/hotels/kingtown-plaza/shanghai/room_new_22.jpg',caption: '豪華景觀客房',                      category: 'room',     location: '7樓' },
    { id: 's-33', src: '/hotels/kingtown-plaza/shanghai/room_new_23.jpg',caption: '行政客房',                          category: 'room',     location: '8樓' },
    { id: 's-34', src: '/hotels/kingtown-plaza/shanghai/room_new_24.jpg',caption: '商務客房',                          category: 'room',     location: '9樓' },
    { id: 's-35', src: '/hotels/kingtown-plaza/shanghai/room_new_25.jpg',caption: '標準客房',                          category: 'room',     location: '10樓' },
    { id: 's-36', src: '/hotels/kingtown-plaza/shanghai/room_new_26.jpg',caption: '商務雙床房',                        category: 'room',     location: '11樓' },
    { id: 's-37', src: '/hotels/kingtown-plaza/shanghai/room_new_27.jpg',caption: '景觀客房',                          category: 'room',     location: '12樓' },
    { id: 's-38', src: '/hotels/kingtown-plaza/shanghai/room_new_28.jpg',caption: '家庭客房',                          category: 'room',     location: '13樓' },
    { id: 's-39', src: '/hotels/kingtown-plaza/shanghai/room_new_30.jpg',caption: '高級客房',                          category: 'room',     location: '15樓' },
    { id: 's-40', src: '/hotels/kingtown-plaza/shanghai/room_new_31.jpg',caption: '精緻客房',                          category: 'room',     location: '16樓' },
    { id: 's-41', src: '/hotels/kingtown-plaza/shanghai/room_new_32.jpg',caption: '豪華套房',                          category: 'suite',    location: '17樓' },
    { id: 's-42', src: '/hotels/kingtown-plaza/shanghai/room_new_33.jpg',caption: '商務套房',                          category: 'suite',    location: '18樓' },
    { id: 's-43', src: '/hotels/kingtown-plaza/shanghai/room_new_34.jpg',caption: '舒適客房',                          category: 'room',     location: '19樓' },
    { id: 's-44', src: '/hotels/kingtown-plaza/shanghai/room_new_35.jpg',caption: '精緻客房',                          category: 'room',     location: '20樓' },
    { id: 's-45', src: '/hotels/kingtown-plaza/shanghai/room_new_36.jpg',caption: '豪華客房',                          category: 'room',     location: '3樓' },
    { id: 's-46', src: '/hotels/kingtown-plaza/shanghai/room_new_37.jpg',caption: '商務套房',                          category: 'suite',    location: '4樓' },
    { id: 's-47', src: '/hotels/kingtown-plaza/shanghai/room_new_38.jpg',caption: '高級客房',                          category: 'room',     location: '5樓' },
    { id: 's-48', src: '/hotels/kingtown-plaza/shanghai/room_new_44.jpg',caption: '商務客房',                          category: 'room',     location: '11樓' },
    { id: 's-49', src: '/hotels/kingtown-plaza/shanghai/room_new_47.jpg',caption: '景觀客房',                          category: 'room',     location: '14樓' },
    { id: 's-50', src: '/hotels/kingtown-plaza/shanghai/room_new_50.jpg',caption: '高級客房',                          category: 'room',     location: '17樓' },
    { id: 's-51', src: '/hotels/kingtown-plaza/shanghai/room_new_52.jpg',caption: '豪華套房',                          category: 'suite',    location: '19樓' },
    { id: 's-52', src: '/hotels/kingtown-plaza/shanghai/room_new_53.jpg',caption: '商務套房',                          category: 'suite',    location: '20樓' },
    { id: 's-53', src: '/hotels/kingtown-plaza/shanghai/room_new_54.jpg',caption: '舒適客房',                          category: 'room',     location: '3樓' },
    { id: 's-54', src: '/hotels/kingtown-plaza/shanghai/room_new_55.jpg',caption: '精緻客房',                          category: 'room',     location: '4樓' },
    { id: 's-55', src: '/hotels/kingtown-plaza/shanghai/room_new_56.jpg',caption: '豪華客房',                          category: 'room',     location: '5樓' },
    { id: 's-56', src: '/hotels/kingtown-plaza/shanghai/room_new_57.jpg',caption: '商務套房',                          category: 'suite',    location: '6樓' },
    { id: 's-57', src: '/hotels/kingtown-plaza/shanghai/room_new_58.jpg',caption: '高級客房',                          category: 'room',     location: '7樓' },
    { id: 's-58', src: '/hotels/kingtown-plaza/shanghai/room_new_59.jpg',caption: '精緻客房',                          category: 'room',     location: '8樓' },
    { id: 's-59', src: '/hotels/kingtown-plaza/shanghai/room_new_61.jpg',caption: '商務客房',                          category: 'room',     location: '10樓' },
    { id: 's-60', src: '/hotels/kingtown-plaza/shanghai/room_new_62.jpg',caption: '豪華景觀客房',                      category: 'room',     location: '11樓' },
    { id: 's-61', src: '/hotels/kingtown-plaza/shanghai/room_new_63.jpg',caption: '行政客房',                          category: 'room',     location: '12樓' },
    { id: 's-62', src: '/hotels/kingtown-plaza/shanghai/room_new_64.jpg',caption: '商務客房',                          category: 'room',     location: '13樓' },
    { id: 's-63', src: '/hotels/kingtown-plaza/shanghai/room_new_65.jpg',caption: '標準客房',                          category: 'room',     location: '14樓' },
    { id: 's-64', src: '/hotels/kingtown-plaza/shanghai/room_new_66.jpg',caption: '商務雙床房',                        category: 'room',     location: '15樓' },
    { id: 's-65', src: '/hotels/kingtown-plaza/shanghai/room_new_67.jpg',caption: '景觀客房',                          category: 'room',     location: '16樓' },
    { id: 's-66', src: '/hotels/kingtown-plaza/shanghai/room_new_68.jpg',caption: '家庭客房',                          category: 'room',     location: '17樓' },
    { id: 's-67', src: '/hotels/kingtown-plaza/shanghai/room_new_70.jpg',caption: '高級客房',                          category: 'room',     location: '19樓' },
    { id: 's-68', src: '/hotels/kingtown-plaza/shanghai/room_new_71.jpg',caption: '精緻客房',                          category: 'room',     location: '20樓' },
    { id: 's-69', src: '/hotels/kingtown-plaza/shanghai/room_new_72.jpg',caption: '豪華套房',                          category: 'suite',    location: '3樓' },
    { id: 's-70', src: '/hotels/kingtown-plaza/shanghai/room_new_73.jpg',caption: '商務套房',                          category: 'suite',    location: '4樓' },
    { id: 's-71', src: '/hotels/kingtown-plaza/shanghai/room_new_74.jpg',caption: '舒適客房',                          category: 'room',     location: '5樓' },
    { id: 's-72', src: '/hotels/kingtown-plaza/shanghai/room_new_75.jpg',caption: '精緻客房',                          category: 'room',     location: '6樓' },
    { id: 's-73', src: '/hotels/kingtown-plaza/shanghai/room_new_76.jpg',caption: '豪華客房',                          category: 'room',     location: '7樓' },
  ],
  hangzhou: [
    { id: 'h-1',  src: '/hotels/hangzhou-hotel/hangzhou/room_suite_01.jpg',caption: '尊享套房（湖景景觀）',               category: 'suite',   location: '19-29樓' },
    { id: 'h-2',  src: '/hotels/hangzhou-hotel/hangzhou/room_suite_02.jpg',caption: '行政套房客廳',                     category: 'suite',   location: '19-29樓' },
    { id: 'h-3',  src: '/hotels/hangzhou-hotel/hangzhou/room_suite_03.jpg',caption: '尊享套房臥室',                     category: 'suite',   location: '19-29樓' },
    { id: 'h-4',  src: '/hotels/hangzhou-hotel/hangzhou/room_suite_04.jpg',caption: '行政套房衛浴',                     category: 'suite',   location: '19-29樓' },
    { id: 'h-5',  src: '/hotels/hangzhou-hotel/hangzhou/room_suite_05.jpg',caption: '豪華套房',                         category: 'suite',   location: '19-29樓' },
    { id: 'h-6',  src: '/hotels/hangzhou-hotel/hangzhou/room_suite_06.jpg',caption: '標準套房',                         category: 'suite',   location: '19-29樓' },
    { id: 'h-7',  src: '/hotels/hangzhou-hotel/hangzhou/room_01.jpg',     caption: '標準客房（武林廣場景觀）',           category: 'room',    location: '10-17樓' },
    { id: 'h-8',  src: '/hotels/hangzhou-hotel/hangzhou/room_02.jpg',     caption: '商務客房',                          category: 'room',    location: '10-17樓' },
    { id: 'h-9',  src: '/hotels/hangzhou-hotel/hangzhou/room_03.jpg',     caption: '豪華客房',                         category: 'room',    location: '10-17樓' },
    { id: 'h-10', src: '/hotels/hangzhou-hotel/hangzhou/room_04.jpg',     caption: '景觀客房（城市天際線）',             category: 'room',    location: '10-17樓' },
    { id: 'h-11', src: '/hotels/hangzhou-hotel/hangzhou/room_05.jpg',     caption: '雙床客房',                          category: 'room',    location: '10-17樓' },
    { id: 'h-12', src: '/hotels/hangzhou-hotel/hangzhou/room_06.jpg',     caption: '標準客房',                          category: 'room',    location: '10-17樓' },
    { id: 'h-13', src: '/hotels/hangzhou-hotel/hangzhou/room_07.jpg',     caption: '商務客房',                          category: 'room',    location: '10-17樓' },
    { id: 'h-14', src: '/hotels/hangzhou-hotel/hangzhou/room_08.jpg',     caption: '豪華客房',                         category: 'room',    location: '10-17樓' },
    { id: 'h-15', src: '/hotels/hangzhou-hotel/hangzhou/room_09.jpg',     caption: '景觀客房',                          category: 'room',    location: '10-17樓' },
    { id: 'h-16', src: '/hotels/hangzhou-hotel/hangzhou/room_10.jpg',     caption: '雙床客房',                          category: 'room',    location: '10-17樓' },
    { id: 'h-17', src: '/hotels/hangzhou-hotel/hangzhou/room_11.jpg',     caption: '商務客房',                          category: 'room',    location: '10-17樓' },
    { id: 'h-18', src: '/hotels/hangzhou-hotel/hangzhou/room_12.jpg',     caption: '豪華客房',                         category: 'room',    location: '10-17樓' },
    { id: 'h-19', src: '/hotels/hangzhou-hotel/hangzhou/room_13.jpg',     caption: '景觀客房',                          category: 'room',    location: '10-17樓' },
    { id: 'h-20', src: '/hotels/hangzhou-hotel/hangzhou/room_14.jpg',     caption: '精緻客房',                          category: 'room',    location: '10-17樓' },
    { id: 'h-21', src: '/hotels/hangzhou-hotel/hangzhou/lobby_01.jpg',   caption: '酒店大堂',                         category: 'public',  location: '1樓' },
    { id: 'h-22', src: '/hotels/hangzhou-hotel/hangzhou/lobby_02.jpg',   caption: '大堂休憩區',                       category: 'public',  location: '1樓' },
    { id: 'h-23', src: '/hotels/hangzhou-hotel/hangzhou/restaurant_01.jpg',caption: '32F 旋轉餐廳「Revolving Restaurant」',category: 'dining',  location: '32樓' },
    { id: 'h-24', src: '/hotels/hangzhou-hotel/hangzhou/restaurant_02.jpg',caption: '5F 中華餐廳「百合軒」',             category: 'dining',  location: '5樓' },
    { id: 'h-25', src: '/hotels/hangzhou-hotel/hangzhou/corridor_01.jpg',caption: '高空走廊景觀',                      category: 'public',  location: '19-29樓' },
    { id: 'h-26', src: '/hotels/hangzhou-hotel/hangzhou/exterior_01.jpg',caption: '酒店外觀（日景）',                  category: 'public',  location: '外觀' },
    { id: 'h-27', src: '/hotels/hangzhou-hotel/hangzhou/exterior_02.jpg',caption: '酒店外觀（武林廣場側）',            category: 'public',  location: '外觀' },
    { id: 'h-28', src: '/hotels/hangzhou-hotel/hangzhou/bathroom_01.jpg',caption: '衛浴空間（標準）',                  category: 'facility',location: '全館' },
    { id: 'h-29', src: '/hotels/hangzhou-hotel/hangzhou/bathroom_02.jpg',caption: '浴缸與備品',                       category: 'facility',location: '全館' },
    { id: 'h-30', src: '/hotels/hangzhou-hotel/hangzhou/view_01.jpg',    caption: '武林廣場景觀（北向き）',            category: 'facility',location: '高層客房' },
  ],
  wuzhenYoushe: [
    { id: 'w-1',  src: '/hotels/wuzhen-youshe/exterior_01.jpg',  caption: '酒店外觀（古典與藝術結合）',  category: 'public',   location: '外觀' },
    { id: 'w-2',  src: '/hotels/wuzhen-youshe/lobby_01.jpg',     caption: '酒店大堂',                   category: 'public',   location: '1樓' },
    { id: 'w-3',  src: '/hotels/wuzhen-youshe/corridor_01.jpg',  caption: '走廊景觀',                   category: 'public',   location: '全館' },
    { id: 'w-4',  src: '/hotels/wuzhen-youshe/room_01.jpg',      caption: '精緻客房',                   category: 'room',     location: '2-5樓' },
    { id: 'w-5',  src: '/hotels/wuzhen-youshe/room_02.jpg',      caption: '商務客房',                   category: 'room',     location: '2-5樓' },
    { id: 'w-6',  src: '/hotels/wuzhen-youshe/room_03.jpg',      caption: '豪華客房',                   category: 'room',     location: '2-5樓' },
    { id: 'w-7',  src: '/hotels/wuzhen-youshe/room_04.jpg',      caption: '景觀客房',                   category: 'room',     location: '2-5樓' },
    { id: 'w-8',  src: '/hotels/wuzhen-youshe/room_05.jpg',      caption: '雙床客房',                   category: 'room',     location: '2-5樓' },
    { id: 'w-9',  src: '/hotels/wuzhen-youshe/room_06.jpg',      caption: '標準客房',                   category: 'room',     location: '2-5樓' },
    { id: 'w-10', src: '/hotels/wuzhen-youshe/room_07.jpg',      caption: '商務客房',                   category: 'room',     location: '2-5樓' },
    { id: 'w-11', src: '/hotels/wuzhen-youshe/room_08.jpg',      caption: '豪華客房',                   category: 'room',     location: '2-5樓' },
    { id: 'w-12', src: '/hotels/wuzhen-youshe/room_09.jpg',      caption: '景觀客房',                   category: 'room',     location: '2-5樓' },
    { id: 'w-13', src: '/hotels/wuzhen-youshe/room_10.jpg',      caption: '雙床客房',                   category: 'room',     location: '2-5樓' },
    { id: 'w-14', src: '/hotels/wuzhen-youshe/room_11.jpg',      caption: '商務客房',                   category: 'room',     location: '2-5樓' },
    { id: 'w-15', src: '/hotels/wuzhen-youshe/room_12.jpg',      caption: '豪華客房',                   category: 'room',     location: '2-5樓' },
    { id: 'w-16', src: '/hotels/wuzhen-youshe/room_13.jpg',      caption: '景觀客房',                   category: 'room',     location: '2-5樓' },
    { id: 'w-17', src: '/hotels/wuzhen-youshe/room_14.jpg',      caption: '精緻客房',                   category: 'room',     location: '2-5樓' },
    { id: 'w-18', src: '/hotels/wuzhen-youshe/room_15.jpg',      caption: '商務客房',                   category: 'room',     location: '2-5樓' },
    { id: 'w-19', src: '/hotels/wuzhen-youshe/room_16.jpg',      caption: '豪華客房',                   category: 'room',     location: '2-5樓' },
    { id: 'w-20', src: '/hotels/wuzhen-youshe/room_17.jpg',      caption: '景觀客房',                   category: 'room',     location: '2-5樓' },
    { id: 'w-21', src: '/hotels/wuzhen-youshe/room_18.jpg',      caption: '雙床客房',                   category: 'room',     location: '2-5樓' },
    { id: 'w-22', src: '/hotels/wuzhen-youshe/room_19.jpg',      caption: '商務客房',                   category: 'room',     location: '2-5樓' },
    { id: 'w-23', src: '/hotels/wuzhen-youshe/room_20.jpg',      caption: '標準客房',                   category: 'room',     location: '2-5樓' },
    { id: 'w-24', src: '/hotels/wuzhen-youshe/room_21.jpg',      caption: '豪華客房',                   category: 'room',     location: '2-5樓' },
    { id: 'w-25', src: '/hotels/wuzhen-youshe/room_22.jpg',      caption: '景觀客房',                   category: 'room',     location: '2-5樓' },
    { id: 'w-26', src: '/hotels/wuzhen-youshe/room_23.jpg',      caption: '精緻客房',                   category: 'room',     location: '2-5樓' },
    { id: 'w-27', src: '/hotels/wuzhen-youshe/room_24.jpg',      caption: '商務客房',                   category: 'room',     location: '2-5樓' },
    { id: 'w-28', src: '/hotels/wuzhen-youshe/room_25.jpg',      caption: '豪華客房',                   category: 'room',     location: '2-5樓' },
    { id: 'w-29', src: '/hotels/wuzhen-youshe/room_26.jpg',      caption: '景觀客房',                   category: 'room',     location: '2-5樓' },
    { id: 'w-30', src: '/hotels/wuzhen-youshe/bathroom_01.jpg',  caption: '衛浴空間',                   category: 'facility', location: '全館' },
    { id: 'w-31', src: '/hotels/wuzhen-youshe/bathroom_02.jpg',  caption: '衛浴設施',                   category: 'facility', location: '全館' },
    { id: 'w-32', src: '/hotels/wuzhen-youshe/bathroom_03.jpg',  caption: '備品配置',                   category: 'facility', location: '全館' },
  ],
  yuzhouChangwan: [
    { id: 'y-1',  src: '/hotels/yuzhou-changwan/room-01.jpg',   caption: '漁舟唱晚·豪華大床房（28㎡景觀）',  category: 'room',    location: '2層' },
    { id: 'y-2',  src: '/hotels/yuzhou-changwan/room-02.jpg',   caption: '客房空間與古韻家具',            category: 'room',    location: '2層' },
    { id: 'y-3',  src: '/hotels/yuzhou-changwan/room-03.jpg',   caption: '中式雕花床頭與燈光',            category: 'room',    location: '2層' },
    { id: 'y-4',  src: '/hotels/yuzhou-changwan/room-04.jpg',   caption: '窗邊休憩區',                     category: 'room',    location: '2層' },
    { id: 'y-5',  src: '/hotels/yuzhou-changwan/room-05.jpg',   caption: '衛浴空間（淋浴）',               category: 'facility',location: '2層' },
    { id: 'y-6',  src: '/hotels/yuzhou-changwan/room-06.jpg',   caption: '古鎮水景view',                  category: 'public',  location: '公共區域' },
    { id: 'y-7',  src: '/hotels/yuzhou-changwan/room-07.jpg',   caption: '客棧外觀與運河',                category: 'public',  location: '外觀' },
  ],
  wuzhenHomestay: [
    { id: 'wh-1', src: '/hotels/wuzhen-homestay/room_01.jpg',   caption: '臨水景觀大床房',                category: 'room',    location: '2層' },
    { id: 'wh-2', src: '/hotels/wuzhen-homestay/room_02.jpg',   caption: '水岸陽台空間',                  category: 'room',    location: '2層' },
    { id: 'wh-3', src: '/hotels/wuzhen-homestay/room_03.jpg',   caption: '中式古典客房',                  category: 'room',    location: '2層' },
    { id: 'wh-4', src: '/hotels/wuzhen-homestay/room_04.jpg',   caption: '古鎮水鄉view',                  category: 'room',    location: '公共區域' },
    { id: 'wh-5', src: '/hotels/wuzhen-homestay/room_05.jpg',   caption: '臨水大床房（夜景）',            category: 'room',    location: '2層' },
    { id: 'wh-6', src: '/hotels/wuzhen-homestay/room_06.jpg',   caption: '衛浴空間',                       category: 'facility',location: '全館' },
    { id: 'wh-7', src: '/hotels/wuzhen-homestay/room_07.jpg',   caption: '民宿外觀與河道',                category: 'public',  location: '外觀' },
  ],
};

// ── Supabase operations ──────────────────────────────────────────────────────

async function fetchPhotos(hotelKey: string): Promise<Photo[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('room_tour_photos')
    .select('id, hotel_key, src, caption, category, location, sort_order')
    .eq('hotel_key', hotelKey)
    .order('sort_order', { ascending: true });

  if (error || !data || data.length === 0) return [];
  return data.map((r: { id: string; hotel_key: string; src: string; caption?: string; category?: string; location?: string; sort_order?: number }) => ({
    id: r.id,
    src: r.src,
    caption: r.caption ?? '',
    category: r.category ?? 'room',
    location: r.location ?? '',
  }));
}

async function upsertPhoto(photo: Photo & { hotelKey: string }): Promise<void> {
  const supabase = createClient();
  await supabase.from('room_tour_photos').upsert(
    { id: photo.id, hotel_key: photo.hotelKey, src: photo.src, caption: photo.caption, category: photo.category, location: photo.location, sort_order: 0 },
    { onConflict: 'id' }
  );
}

async function deletePhotoById(id: string): Promise<void> {
  const supabase = createClient();
  await supabase.from('room_tour_photos').delete().eq('id', id);
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function loadHotelPhotos(hotelKey: string): Promise<Photo[]> {
  try {
    const photos = await fetchPhotos(hotelKey);
    if (photos.length > 0) return photos;
    // Fall back to defaults if Supabase is empty
    return HOTELS_DEFAULT_PHOTOS[hotelKey] ?? [];
  } catch {
    return HOTELS_DEFAULT_PHOTOS[hotelKey] ?? [];
  }
}

export async function syncPhoto(photo: Photo, hotelKey: string): Promise<void> {
  try {
    await upsertPhoto({ ...photo, hotelKey });
  } catch (e) {
    console.error('[RoomTourService] syncPhoto failed:', e);
  }
}

export async function removePhoto(id: string): Promise<void> {
  try {
    await deletePhotoById(id);
  } catch (e) {
    console.error('[RoomTourService] removePhoto failed:', e);
  }
}

export async function syncAllPhotos(photos: Photo[], hotelKey: string): Promise<void> {
  try {
    const supabase = createClient();
    const rows = photos.map((p, i) => ({
      id: p.id, hotel_key: hotelKey, src: p.src,
      caption: p.caption, category: p.category,
      location: p.location, sort_order: i,
    }));
    // Upsert all: delete then re-insert for clean sync
    await supabase.from('room_tour_photos').delete().eq('hotel_key', hotelKey);
    if (rows.length > 0) {
      await supabase.from('room_tour_photos').insert(rows);
    }
  } catch (e) {
    console.error('[RoomTourService] syncAllPhotos failed:', e);
  }
}

export function hasCustomOverrides(_hotelKey: string): boolean {
  // This is called by the React hook to determine if user modifications exist
  return false;
}