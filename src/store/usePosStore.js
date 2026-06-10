import { create } from 'zustand';

const getLocalISOString = (date) => {
  const target = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return target.toISOString().slice(0, 16);
};

export const usePosStore = create((set) => ({
  initialAction: null,
  cart: [],
  selectedCustomer: null,
  customerSearch: '',
  biayaTambahan: 0,
  selectedDiscountId: '',
  catatan: '',
  waktuTransaksi: getLocalISOString(new Date()),
  estimasiSelesai: (() => {
    const initFinish = new Date();
    initFinish.setHours(initFinish.getHours() + 2);
    return getLocalISOString(initFinish);
  })(),
  estimasiManual: false,
  metodePembayaran: 'Tunai',
  qrisType: 'dinamis',
  vaType: 'dinamis',

  // Actions
  setInitialAction: (action) => set({ initialAction: action }),

  setField: (field, value) => set({ [field]: value }),

  setCart: (cart) => set({ cart }),

  addToCart: (product) => set((state) => {
    const existing = state.cart.find(i => i.id === product.id);
    if (existing) {
      return {
        cart: state.cart.map(i => 
          i.id === product.id 
            ? { ...i, quantity: Number((Number(i.quantity) + 1).toFixed(2)) } 
            : i
        )
      };
    }
    return {
      cart: [...state.cart, { ...product, quantity: 1.00, selected_variant: '', variant_price_modifier: 0 }]
    };
  }),

  updateCartItemQty: (itemId, qty) => set((state) => {
    const parsed = parseFloat(qty);
    if (isNaN(parsed) || parsed <= 0) {
      return { cart: state.cart.filter(i => i.id !== itemId) };
    }
    return {
      cart: state.cart.map(i => 
        i.id === itemId 
          ? { ...i, quantity: Number(parsed.toFixed(2)) } 
          : i
      )
    };
  }),

  removeFromCart: (itemId) => set((state) => ({
    cart: state.cart.filter(i => i.id !== itemId)
  })),

  updateCartItemVariant: (itemId, variantName, priceModifier) => set((state) => ({
    cart: state.cart.map(i => 
      i.id === itemId 
        ? { ...i, selected_variant: variantName, variant_price_modifier: priceModifier } 
        : i
    )
  })),

  clearCart: () => set({
    cart: [],
    selectedCustomer: null,
    customerSearch: '',
    biayaTambahan: 0,
    selectedDiscountId: '',
    catatan: '',
    waktuTransaksi: getLocalISOString(new Date()),
    metodePembayaran: 'Tunai'
  }),

  loadHoldSnapshot: (snap) => set({
    cart: snap.cart || [],
    selectedCustomer: snap.selectedCustomer || null,
    customerSearch: snap.customerSearch || '',
    biayaTambahan: snap.biayaTambahan || 0,
    selectedDiscountId: snap.selectedDiscountId || '',
    catatan: snap.catatan || '',
    waktuTransaksi: snap.waktuTransaksi || getLocalISOString(new Date()),
    estimasiSelesai: snap.estimasiSelesai || (() => {
      const initFinish = new Date();
      initFinish.setHours(initFinish.getHours() + 2);
      return getLocalISOString(initFinish);
    })(),
    estimasiManual: snap.estimasiManual || false,
    metodePembayaran: snap.metodePembayaran || 'Tunai',
  })
}));
