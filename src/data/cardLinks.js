import { YANG_CARD_SLUG } from '../config/yangBoss.js';

// =============================================
//  Electronic name-card (名片) links — NameGain
//  Key   = person's Chinese name (no English suffix)
//  Value = full card URL
//
//  Lookup via getCardLink(name): it strips any English
//  suffix / spaces from the member's name first, so
//  "陳麗惠Cindy" and "梁虔駖 Ben" still match.
//  Not everyone has a card — missing = no 我的名片 button.
// =============================================
const BASE = 'https://namegain.introvista.ai/card/';
const E = {
  '方榮久': 'fcf8d38e-041f-4509-b428-cbc9246dd39e?ref=bb33eb828306',
  '葉奕廷': '936cc968-9557-4f15-abbb-eca2a0f3ebf4?ref=0d31ca51cd8d',
  '張凱竣': '3c9416d0-5ae8-40b1-82e1-f7755285e85b',
  '張巧瑜': 'clairechang',
  '曾筱婷': 'c259da51-7199-4d51-ada7-d3d577366916?ref=6e338ce28269',
  '工藤七海': 'afb9bfdc-9669-4578-91b8-646fc895467d?ref=57375fa4eec3',
  '馮志綱': '1d627510-733c-4d1d-8f49-8efd74b8af6d?ref=f8f062cbe836',
  '呂品蓁': 'd1c12877-b247-4636-b88d-c859f5cefb4b?ref=c06acb187f5f',
  '黃湍淳': '6180eadc-7cbb-40b7-9c59-afdbbf76b889?ref=f84335d55e72',
  '呂宜蓁': '888dc4c5-b0f2-4b90-8cf4-138da949a98b?ref=003bf31171d0',
  '郭愛珠': '11647c30-3ad5-4753-bf4a-35ed4801f9d6?ref=25d4177ff097',
  '宋涵識': '788b2647-dea9-458f-88fe-9e9f7b897352?ref=3e372610a542',
  '劉冠良': '4468cb57-1518-4c0a-9c3c-869709a08008',
  '梁虔駖': 'ben',
  '黃立喬': '1d2382ca-a284-400e-b068-2c9332e1010b?ref=0d4dce68f979',
  '藍明得': '2a7e6ce5-36fd-4a29-a28d-e5275a0922eb?ref=2c89cc8dbae4',
  '周玉茹': 'ebb5a7f1-b34b-4baf-b722-c82782ee8a84?ref=68f717320a89',
  '陳子雯': 'teresa-chen',
  '李鴻毅': '98a8f050-a8a6-4bb2-88de-d25d052a8288?ref=e7933ce071ac',
  '李皇家': '0ac3d82b-9dd4-4092-86e4-b5ceb162e790?ref=1005d51ba6ae',
  '孫成育': '44bcff67-9de8-417f-8e74-93cff8f1d5f0?ref=3d6f60b70554',
  '張松源': '9306a603-826e-4adc-ad79-d566ce8983fe?ref=e16441a9ea27',
  '林宗平': '06eb2751-e044-4f6a-8fc3-9c7abf3b5b54?ref=5b9f4fca13b4',
  '蕭淑蓉': '108500cb-aed0-4023-8c7c-c5e412b5313c?ref=7ba82059d723',
  '楊曉凡': 'be941196-1533-47e2-98a9-5f1d7bc45eff?ref=570b31be504e',
  '蔡馨葳': '91c83633-7d3a-4297-9dea-567f7aa5c0cf',
  '游姿菱': '92c7ef8a-c827-4a04-8a24-bf433999a42d',
  '陳姵文': '29b1793e-86bc-4230-8f51-a5759baff221?ref=a468113114b6',
  '劉武嘉': '4eeb77a1-ea24-46bd-a3b8-e08991d81021?ref=c2572a297bd5',
  '吳侑縉': '536f31a6-299e-4e87-8724-c9ff7cb7460e',
  '吳庭彰': '7c320de3-efab-4420-b5dc-5782a89c6e2e?ref=126310da6461',
  '洪儀君': '3eb7939c-6cf5-4d60-b401-e1b08a88d82f?ref=e3d5e4aecc89',
  '邱耀賢': '132086f7-6192-4cc1-b1db-cdbb25a74212?ref=627c65edebed',
  '詹鴻鵠': 'a148c1de-859a-4e85-82c2-cf751b3195dc?ref=0d0affce832f',
  '蕭旭庭': '0313cbcb-cead-4949-9012-eb940bf0d459?ref=756f7b21ada1',
  '潘咨吟': 'a7344033-997a-4f97-8344-725b8537c895?ref=da246e847467',
  '石珮萱': '4aeda386-a57c-46ce-8882-4c0b44a5a9dc?ref=b34089dc75b3',
  '張婕': '0a8d993e-8517-4c08-9899-33f7d33cd80f?ref=51f683b77229',
  '林以晴': '82ae8737-ef1d-48fc-9ebe-a46d1a9685bf?ref=ca856b1e9fdb',
  '楊妙玲': '24520146-d36f-42bc-9c48-a37c1e806d75?ref=35a1593fa1fe',
  '康彥琳': 'c0d3ce9c-d245-4787-a8f2-7b6a1638d7c0',
  '張文婷': '11d5c9f4-73a6-4af0-850f-988c57e0d446',
  '蘇泰勝': '6b5c27c8-477a-44a5-9ca5-a44334a3b263?ref=f11cd1929d03',
  '朱苡菱': '5210emma',
  '江學洋': 'f5d30797-0f93-47e4-9768-8585cec9649d?ref=efc02eafc63e',
  '鄭涵秦': 'd1f0b911-a74b-4fcc-ad00-312833006d44?ref=2cb094800d8a',
  '陳語珊': '51359eda-b4f3-4e12-89e3-806c59256f39?ref=539410dd931a',
  '林于翔': '80275829-e312-4be3-850d-b6cd2677e5f3?ref=cfe3d8b7d424',
  '王彥萍': 'f8161b4a-7de0-451e-9e61-4e8db623bc7f?ref=9a66399bfcda',
  '王定廣': '62136781-bbad-4d04-89a9-0b32917cf230?ref=72849786fda5',
  '葉書婷': 'ec5f00b1-9166-43b5-803b-a52dfc9c956a?ref=e29d697e2fe7',
  '陳麗惠': 'f181f80f-9c8d-4644-a3d1-666b24bd9520?ref=f79a0fd100aa',
  '陳易白': 'e783dc6f-bc18-402c-b8a0-2d713b77f49e?ref=5598f861e73d',
  '林亞叡': 'd69437cd-d5fd-415e-9318-1df632992606?ref=e230771ee826',
  '謝馥安': 'af696ba4-41ae-4d3e-8b91-2985d2ebd70d?ref=ea517386086d',
  '譚愷悌': 'cathytan',
  '楊哲瑋': 'a6beb421-0314-45ce-a9f9-0c7d4d6d582e?ref=56e6f5829675',
  '黃同慶': '98d0d0c2-59d1-42e3-8378-c62252ff4087?ref=3b8895b9c2ba',
  '林家蔚': '8046349d-320e-4560-8c11-745e920d4d35',
  '張淳瑞': '6538eff4-e509-4bea-98cc-97751c79172a?ref=34f9e7fe688c',
  '曾惠君': 'a858869c-00f2-4160-9465-1229839bc905?ref=fbe402f68aac',
  '楊宜靜': '1e648d7a-97ba-44c3-afc1-0ac5b388e758?ref=40feb8ebd684',
  '吳宜靜': '9e0b5bb9-f95b-4101-a4d1-b87c32f6891a?ref=227ff507e798',
  '曾士豪': '49f7531b-6b99-465d-8f0c-5a3d92bb87e1?ref=148c50636a3e',
  '王思穎': '933e5f69-9b87-4fc9-b355-3a91e23c6e85?ref=f66865461ded',
  // 董顧（中山 / 三蘆）新增
  '鍾坤宏': '2619fdf8-8e72-4cf4-8908-6c1c5f8867d0?ref=f31da9788b57',
  '廖筱蘭': '789c9cb2-0052-4ba5-b25b-0b8b071c650b?ref=d067203fb556',
  '張力文': '90a8de9d-87c0-4875-91e0-c33da3ee8e6a?ref=d34a3af6da3d',
  '陳沛緹': '6b095d74-f86c-4c27-8299-c4794210b3e6?ref=94f65f68e4db',
  '洪岳裕': 'ddf6283a-4b05-44b0-8c53-a08bbf4d0e8a?ref=e63e94bcf8a4',
  ...(YANG_CARD_SLUG ? { '楊日陞': YANG_CARD_SLUG } : {}),
};

export const CARD_LINKS = Object.fromEntries(
  Object.entries(E).map(([name, path]) => [name, BASE + path])
);

// Resolve a card link from a (possibly suffixed) display name.
export function getCardLink(name) {
  if (!name) return '';
  if (CARD_LINKS[name]) return CARD_LINKS[name];
  const cjk = String(name).replace(/[^㐀-鿿]/g, ''); // keep CJK only
  return CARD_LINKS[cjk] || '';
}
