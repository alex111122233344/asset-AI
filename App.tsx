
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Asset, AssetType, Currency, MarketData } from './types';
import { THEME } from './constants';
import { fetchFinanceData } from './services/financeService';
import { 
  Plus, 
  Trash2, 
  Edit3, 
  TrendingUp, 
  Wallet, 
  RefreshCw,
  X,
  Eye,
  EyeOff,
  LayoutGrid
} from 'lucide-react';

const App: React.FC = () => {
  const [assets, setAssets] = useState<Asset[]>(() => {
    const saved = localStorage.getItem('komorebi_assets');
    return saved ? JSON.parse(saved) : [];
  });
  const [rates, setRates] = useState({ USD: 32.5, JPY: 0.21 });
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [showBalance, setShowBalance] = useState(true);

  // Persistence
  useEffect(() => {
    localStorage.setItem('komorebi_assets', JSON.stringify(assets));
  }, [assets]);

  const refreshData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchFinanceData(assets);
      setRates(data.rates);
      
      const updatedAssets = assets.map(asset => {
        const found = data.prices.find(p => p.symbol.includes(asset.symbol));
        if (found) {
          return { 
            ...asset, 
            currentPrice: found.price, 
            dailyChangePct: found.dailyChangePct,
            name: found.name 
          };
        }
        return asset;
      });
      setAssets(updatedAssets);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [assets]);

  useEffect(() => {
    refreshData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalValueTWD = useMemo(() => assets.reduce((acc, asset) => {
    const price = asset.currentPrice || asset.avgPrice;
    const value = price * asset.shares;
    let rate = 1;
    if (asset.currency === Currency.USD) rate = rates.USD;
    else if (asset.currency === Currency.JPY) rate = rates.JPY;
    return acc + (value * rate);
  }, 0), [assets, rates]);

  const avgDailyChangeRate = useMemo(() => {
    const stockAssets = assets.filter(a => (a.type === AssetType.TW_STOCK || a.type === AssetType.US_STOCK) && a.dailyChangePct !== undefined);
    if (stockAssets.length === 0) return 0;
    
    let weightedSum = 0;
    let totalStockValue = 0;
    
    stockAssets.forEach(a => {
      let rate = 1;
      if (a.currency === Currency.USD) rate = rates.USD;
      else if (a.currency === Currency.JPY) rate = rates.JPY;
      
      const value = (a.currentPrice || a.avgPrice) * a.shares * rate;
      weightedSum += (a.dailyChangePct || 0) * value;
      totalStockValue += value;
    });
    
    return totalStockValue > 0 ? weightedSum / totalStockValue : 0;
  }, [assets, rates]);

  const groupedAssets = useMemo(() => {
    return {
      [AssetType.TW_STOCK]: assets.filter(a => a.type === AssetType.TW_STOCK),
      [AssetType.US_STOCK]: assets.filter(a => a.type === AssetType.US_STOCK),
      [AssetType.CASH]: assets.filter(a => a.type === AssetType.CASH),
      [AssetType.OTHER]: assets.filter(a => a.type === AssetType.OTHER),
    };
  }, [assets]);

  const handleSaveAsset = (formData: any) => {
    if (editingAsset) {
      setAssets(prev => prev.map(a => a.id === editingAsset.id ? { ...a, ...formData } : a));
    } else {
      const newAsset: Asset = {
        id: crypto.randomUUID(),
        ...formData
      };
      setAssets(prev => [...prev, newAsset]);
    }
    setIsModalOpen(false);
    setEditingAsset(null);
  };

  const handleDeleteAsset = (id: string) => {
    if (window.confirm('確定要刪除這筆資產嗎？')) {
      setAssets(prev => prev.filter(a => a.id !== id));
    }
  };

  const openEdit = (asset: Asset) => {
    setEditingAsset(asset);
    setIsModalOpen(true);
  };

  const maskValue = (val: number) => {
    if (!showBalance) return '******';
    return val.toLocaleString(undefined, { maximumFractionDigits: 0 });
  };

  return (
    <div className={`min-h-screen ${THEME.bg} pb-32`}>
      <header className="pt-10 px-6 pb-6 bg-[#FDFBF7] border-b border-[#E5E1DA]">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-serif font-bold text-[#4A4A4A] tracking-wider">資產AI</h1>
            <p className="text-sm text-[#8C8C8C]">AI Powered · 資産管理</p>
          </div>
          <button 
            onClick={refreshData}
            disabled={loading}
            className="p-2 rounded-full hover:bg-black/5 transition-colors"
          >
            <RefreshCw size={20} className={`${loading ? 'animate-spin' : ''} ${THEME.accentText}`} />
          </button>
        </div>

        <div className={`${THEME.card} p-6 rounded-2xl relative overflow-hidden`}>
          <div className="relative z-10">
            <div className="flex justify-between items-center mb-1">
              <p className="text-xs uppercase tracking-widest text-[#8C8C8C]">淨資產(TWD)</p>
              <button 
                onClick={() => setShowBalance(!showBalance)}
                className="p-1 text-[#8C8C8C] hover:text-[#4A4A4A] transition-colors"
              >
                {showBalance ? <Eye size={16} /> : <EyeOff size={16} />}
              </button>
            </div>
            <h2 className="text-4xl font-serif font-bold text-[#4A4A4A]">
              ${maskValue(totalValueTWD)}
            </h2>
            
            <div className="flex gap-4 mt-6 border-t border-[#E5E1DA] pt-4">
              <div className="flex-1">
                <p className="text-[10px] uppercase tracking-widest text-[#8C8C8C] mb-1">資產數量</p>
                <p className="text-lg font-bold text-[#4A4A4A]">{assets.length} <span className="text-xs font-normal text-[#8C8C8C]">項</span></p>
              </div>
              <div className="flex-1 border-l border-[#E5E1DA] pl-4">
                <p className="text-[10px] uppercase tracking-widest text-[#8C8C8C] mb-1">資產日增率</p>
                <p className={`text-lg font-bold ${avgDailyChangeRate >= 0 ? THEME.success : THEME.danger}`}>
                  {avgDailyChangeRate >= 0 ? '+' : ''}{avgDailyChangeRate.toFixed(2)}%
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center mt-4 gap-3">
              <span className="text-[10px] px-2 py-1 bg-[#8DA399]/10 text-[#8DA399] rounded">
                1 USD = {rates.USD.toFixed(2)} TWD
              </span>
              <span className="text-[10px] px-2 py-1 bg-[#8DA399]/10 text-[#8DA399] rounded">
                1 JPY = {rates.JPY.toFixed(3)} TWD
              </span>
            </div>
          </div>
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#8DA399]/5 rounded-full -mr-16 -mt-16" />
        </div>
      </header>

      <main className="px-6 py-6 space-y-8">
        {assets.length === 0 ? (
          <div className="py-20 text-center space-y-4">
            <div className="w-16 h-16 bg-[#E5E1DA] rounded-full mx-auto flex items-center justify-center text-[#8C8C8C]">
              <Wallet size={32} />
            </div>
            <p className="text-[#8C8C8C]">尚無資產內容，點擊下方按鈕新增</p>
          </div>
        ) : (
          <>
            {(Object.entries(groupedAssets) as [AssetType, Asset[]][]).map(([type, list]) => (
              list.length > 0 && (
                <div key={type} className="space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-1 h-4 bg-[#7C8B83] rounded-full"></div>
                    <h3 className="text-sm font-serif font-bold text-[#8C8C8C] uppercase tracking-widest">
                      {type === AssetType.TW_STOCK ? '台股資產' : 
                       type === AssetType.US_STOCK ? '美股資產' : 
                       type === AssetType.CASH ? '現金資產' : '其他資產'}
                    </h3>
                  </div>
                  <div className="space-y-4">
                    {list.map(asset => (
                      <AssetItem 
                        key={asset.id} 
                        asset={asset} 
                        rates={rates}
                        showBalance={showBalance}
                        onDelete={() => handleDeleteAsset(asset.id)}
                        onEdit={() => openEdit(asset)}
                      />
                    ))}
                  </div>
                </div>
              )
            ))}
          </>
        )}
      </main>

      <div className="fixed bottom-8 left-0 right-0 px-6 flex justify-center z-20">
        <button 
          onClick={() => { setEditingAsset(null); setIsModalOpen(true); }}
          className={`${THEME.button} shadow-xl shadow-[#7C8B83]/30 px-8 py-4 rounded-full flex items-center gap-3 active:scale-95 transition-all`}
        >
          <Plus size={24} />
          <span className="font-medium tracking-wide">新增資產</span>
        </button>
      </div>

      {isModalOpen && (
        <AssetModal 
          isOpen={isModalOpen} 
          onClose={() => { setIsModalOpen(false); setEditingAsset(null); }} 
          onSave={handleSaveAsset}
          initialData={editingAsset}
        />
      )}
    </div>
  );
};

const AssetItem: React.FC<{ 
  asset: Asset; 
  rates: { USD: number, JPY: number }; 
  showBalance: boolean;
  onDelete: () => void;
  onEdit: () => void;
}> = ({ asset, rates, showBalance, onDelete, onEdit }) => {
  const currentPrice = asset.currentPrice || asset.avgPrice;
  const value = currentPrice * asset.shares;
  
  let rate = 1;
  if (asset.currency === Currency.USD) rate = rates.USD;
  else if (asset.currency === Currency.JPY) rate = rates.JPY;
  
  const valueTWD = value * rate;
  const profit = (currentPrice - asset.avgPrice) * asset.shares;
  const profitPct = asset.avgPrice !== 0 ? ((currentPrice - asset.avgPrice) / asset.avgPrice) * 100 : 0;

  const displayVal = (val: number) => showBalance ? val.toLocaleString(undefined, { maximumFractionDigits: 0 }) : '******';

  return (
    <div className={`${THEME.card} p-5 rounded-xl group relative active:bg-black/[0.02] transition-colors overflow-hidden`}>
      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity z-10">
        <button onClick={(e) => { e.stopPropagation(); onEdit(); }} className="p-1.5 text-[#8C8C8C] hover:text-[#4A4A4A] bg-white rounded-full shadow-sm">
          <Edit3 size={14} />
        </button>
        <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className={`p-1.5 ${THEME.danger} bg-white rounded-full shadow-sm`}>
          <Trash2 size={14} />
        </button>
      </div>

      <div className="flex justify-between items-start mb-3 pr-12">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
            asset.type === AssetType.US_STOCK ? 'bg-blue-50 text-blue-600' : 
            asset.type === AssetType.TW_STOCK ? 'bg-red-50 text-red-600' : 
            asset.type === AssetType.CASH ? 'bg-orange-50 text-orange-600' : 'bg-purple-50 text-purple-600'
          }`}>
            {asset.type === AssetType.CASH ? <Wallet size={20} /> : 
             asset.type === AssetType.OTHER ? <LayoutGrid size={20} /> : <TrendingUp size={20} />}
          </div>
          <div className="max-w-[120px]">
            <h3 className="font-bold text-lg leading-tight truncate">{asset.symbol}</h3>
            <p className="text-[10px] text-[#8C8C8C] truncate">{asset.name || '資產項'}</p>
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="font-bold text-lg leading-none">${displayVal(valueTWD)}</p>
          <div className="flex flex-col items-end mt-1">
             <p className={`text-[10px] font-medium leading-none ${profit >= 0 ? THEME.success : THEME.danger}`}>
              {profit >= 0 ? '+' : ''}{displayVal(profit)} ({profitPct.toFixed(2)}%)
            </p>
            {asset.dailyChangePct !== undefined && asset.type !== AssetType.CASH && asset.type !== AssetType.OTHER && (
              <p className={`text-[10px] font-bold mt-1 leading-none ${asset.dailyChangePct >= 0 ? THEME.success : THEME.danger}`}>
                今日: {asset.dailyChangePct >= 0 ? '+' : ''}{asset.dailyChangePct.toFixed(2)}%
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs text-[#8C8C8C] border-t border-[#E5E1DA] pt-3">
        <div>
          {asset.type === AssetType.CASH || asset.type === AssetType.OTHER ? '持有金額' : '持有股數'}: 
          <span className="text-[#4A4A4A] font-medium ml-1">{displayVal(asset.shares)}</span>
          {asset.type === AssetType.TW_STOCK && (
            <span className="text-[10px] text-[#8C8C8C] block sm:inline sm:ml-1 mt-0.5 sm:mt-0">(一張：1000股)</span>
          )}
        </div>
        <div className="text-right">
          {asset.type !== AssetType.CASH && asset.type !== AssetType.OTHER ? (
            <>目前市價: <span className="text-[#4A4A4A] font-medium">{asset.currency === Currency.USD ? '$' : ''}{displayVal(currentPrice)} {asset.currency}</span></>
          ) : (
            <>幣別: <span className="text-[#4A4A4A] font-medium">{asset.currency}</span></>
          )}
        </div>
      </div>
    </div>
  );
};

interface AssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  initialData: Asset | null;
}

const AssetModal: React.FC<AssetModalProps> = ({ onClose, onSave, initialData }) => {
  const [type, setType] = useState<AssetType>(initialData?.type || AssetType.TW_STOCK);
  const [symbol, setSymbol] = useState(initialData?.symbol || '');
  const [shares, setShares] = useState(initialData?.shares?.toString() || '');
  const [avgPrice, setAvgPrice] = useState(initialData?.avgPrice?.toString() || '');
  const [currency, setCurrency] = useState<Currency>(initialData?.currency || Currency.TWD);

  useEffect(() => {
    if (type === AssetType.US_STOCK) {
      setCurrency(Currency.USD);
      if (avgPrice === '1' && !initialData) setAvgPrice('');
    } else if (type === AssetType.TW_STOCK) {
      setCurrency(Currency.TWD);
      if (avgPrice === '1' && !initialData) setAvgPrice('');
    } else if (type === AssetType.CASH) {
      setAvgPrice('1');
    } else if (type === AssetType.OTHER) {
      setAvgPrice('1');
      if (currency === Currency.JPY) setCurrency(Currency.TWD); // Default Other to TWD or USD
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalSymbol = type === AssetType.CASH ? currency : symbol.toUpperCase();
    if ((type !== AssetType.CASH && !symbol) || !shares || !avgPrice) {
      alert("請填寫所有欄位");
      return;
    }
    onSave({
      type,
      symbol: finalSymbol,
      shares: parseFloat(shares),
      avgPrice: parseFloat(avgPrice),
      currency,
      name: initialData?.name || (type === AssetType.CASH ? `${currency} 現金` : (type === AssetType.OTHER ? symbol : ''))
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm">
      <div className="bg-[#FDFBF7] w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-6 border-b border-[#E5E1DA] flex justify-between items-center">
          <h2 className="text-xl font-serif font-bold text-[#4A4A4A]">
            {initialData ? '修改資產' : '新增資產'}
          </h2>
          <button onClick={onClose} className="text-[#8C8C8C] p-2"><X size={24} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="flex gap-1 p-1 bg-[#E5E1DA]/30 rounded-lg">
            {[AssetType.TW_STOCK, AssetType.US_STOCK, AssetType.CASH, AssetType.OTHER].map(t => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={`flex-1 py-2 text-[11px] font-bold rounded-md transition-all ${
                  type === t ? 'bg-white shadow-sm text-[#7C8B83]' : 'text-[#8C8C8C]'
                }`}
              >
                {t === AssetType.TW_STOCK ? '台股' : t === AssetType.US_STOCK ? '美股' : t === AssetType.CASH ? '現金' : '其他'}
              </button>
            ))}
          </div>

          <div className="space-y-4">
            {type !== AssetType.CASH && (
              <div>
                <label className="text-xs text-[#8C8C8C] uppercase tracking-widest block mb-1">
                  {type === AssetType.OTHER ? '資產名稱' : '股票代號'}
                </label>
                <input 
                  value={symbol}
                  onChange={e => setSymbol(e.target.value)}
                  placeholder={type === AssetType.OTHER ? "例如: 黃金 / 比特幣" : "例如: 2330 / AAPL"}
                  className="w-full bg-[#E5E1DA]/20 border border-transparent focus:border-[#7C8B83] focus:bg-white p-3 rounded-lg outline-none transition-all"
                  required
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-[#8C8C8C] uppercase tracking-widest block mb-1">
                  {type === AssetType.CASH || type === AssetType.OTHER ? '金額' : '持有股數'}
                  {type === AssetType.TW_STOCK && (
                    <span className="text-[9px] ml-1 normal-case opacity-70">(一張：1000股)</span>
                  )}
                </label>
                <input 
                  type="number"
                  inputMode="decimal"
                  step="any"
                  value={shares}
                  onChange={e => setShares(e.target.value)}
                  placeholder="0"
                  className="w-full bg-[#E5E1DA]/20 border border-transparent focus:border-[#7C8B83] focus:bg-white p-3 rounded-lg outline-none transition-all"
                  required
                />
              </div>
              <div>
                <label className="text-xs text-[#8C8C8C] uppercase tracking-widest block mb-1">
                  {type === AssetType.CASH || type === AssetType.OTHER ? '幣別' : '買入均價'}
                </label>
                {type === AssetType.CASH || type === AssetType.OTHER ? (
                  <div className="relative">
                    <select 
                      value={currency}
                      onChange={e => setCurrency(e.target.value as Currency)}
                      className="w-full bg-[#E5E1DA]/20 border border-transparent focus:border-[#7C8B83] focus:bg-white p-3 rounded-lg outline-none transition-all appearance-none"
                    >
                      <option value={Currency.TWD}>TWD</option>
                      <option value={Currency.USD}>USD</option>
                      {type === AssetType.CASH && <option value={Currency.JPY}>JPY</option>}
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-50">
                      <X size={12} className="rotate-45" />
                    </div>
                  </div>
                ) : (
                  <div className="relative">
                    <input 
                      type="number"
                      inputMode="decimal"
                      step="any"
                      value={avgPrice}
                      onChange={e => setAvgPrice(e.target.value)}
                      placeholder="0.00"
                      className="w-full bg-[#E5E1DA]/20 border border-transparent focus:border-[#7C8B83] focus:bg-white p-3 pr-12 rounded-lg outline-none transition-all"
                      required
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-[#8C8C8C] font-bold pointer-events-none">
                      {currency}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <button 
            type="submit"
            className={`w-full ${THEME.button} py-4 rounded-xl font-bold tracking-widest shadow-lg shadow-[#7C8B83]/20 active:scale-[0.98] transition-all`}
          >
            {initialData ? '確認更新' : '保存資產'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default App;
