/* Pengaturan jadwal bersama. Semua jam memakai WIB (+07:00).
   Menjelang hari-H: ubah TESTING_OPEN menjadi false, hanya di sini. */
window.EG_CONFIG = {
  TESTING_OPEN: true,
  OPEN_AT: {
    photobooth: '2026-11-17T07:00:00+07:00',
    game1:      '2026-11-17T09:00:00+07:00',
    game2:      '2026-11-17T12:00:00+07:00',
    game3:      '2026-11-17T15:00:00+07:00',
    prize:      '2026-11-17T19:00:00+07:00'
  },
  unlockDate: function(key){
    return this.TESTING_OPEN ? new Date('2024-01-01T00:00:00+07:00') : new Date(this.OPEN_AT[key]);
  }
};
