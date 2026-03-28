import { ShoppingBag, Tag } from 'lucide-react';

const mockItems = [
  { id: '1', name: 'オリジナルTシャツ', description: 'コミュニティ限定デザインTシャツ', category: 'PHYSICAL', requiredMiles: 2000, stock: 50, imageUrl: null },
  { id: '2', name: '個別コンサル30分', description: '講師との1対1コンサルティング', category: 'SERVICE', requiredMiles: 5000, stock: 10, imageUrl: null },
  { id: '3', name: '限定PDF資料', description: '非公開の特別教材PDF', category: 'DIGITAL', requiredMiles: 500, stock: null, imageUrl: null },
  { id: '4', name: 'VIPルームアクセス（1ヶ月）', description: '限定Discordチャンネルへのアクセス権', category: 'PERMISSION', requiredMiles: 3000, stock: null, imageUrl: null },
  { id: '5', name: '次回講座20%割引', description: '次回開催の講座の割引クーポン', category: 'DISCOUNT', requiredMiles: 1500, stock: 30, imageUrl: null },
  { id: '6', name: 'VIPオフ会招待枠', description: '限定オフ会への参加権', category: 'EXPERIENCE', requiredMiles: 10000, stock: 5, imageUrl: null },
];

const categoryLabels: Record<string, { label: string; color: string }> = {
  PHYSICAL: { label: '物理商品', color: 'bg-blue-100 text-blue-700' },
  DIGITAL: { label: 'デジタル', color: 'bg-green-100 text-green-700' },
  SERVICE: { label: 'サービス', color: 'bg-purple-100 text-purple-700' },
  PERMISSION: { label: '権限', color: 'bg-orange-100 text-orange-700' },
  DISCOUNT: { label: '割引', color: 'bg-pink-100 text-pink-700' },
  EXPERIENCE: { label: '体験', color: 'bg-cyan-100 text-cyan-700' },
};

export default function ExchangePage() {
  const userMiles = 3250;
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">交換カタログ</h1>
        <div className="flex items-center gap-2 bg-indigo-50 px-4 py-2 rounded-lg">
          <ShoppingBag className="w-4 h-4 text-indigo-600" />
          <span className="text-sm font-semibold text-indigo-700">残高: {userMiles.toLocaleString()} マイル</span>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {mockItems.map((item) => {
          const canAfford = userMiles >= item.requiredMiles;
          const cat = categoryLabels[item.category];
          return (
            <div key={item.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="h-40 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                <Tag className="w-12 h-12 text-gray-400" />
              </div>
              <div className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cat.color}`}>{cat.label}</span>
                  {item.stock !== null && (
                    <span className="text-xs text-gray-400">残り{item.stock}個</span>
                  )}
                </div>
                <h3 className="text-sm font-semibold text-gray-900">{item.name}</h3>
                <p className="text-xs text-gray-500 mt-1">{item.description}</p>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-lg font-bold text-indigo-600">{item.requiredMiles.toLocaleString()} <span className="text-xs font-normal">マイル</span></span>
                  <button
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                      canAfford
                        ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    }`}
                    disabled={!canAfford}
                  >
                    {canAfford ? '交換する' : 'マイル不足'}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
