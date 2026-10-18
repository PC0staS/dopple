# Dopple
#
#   make            lista los objetivos disponibles
#   make dev        desarrollo con recarga
#   make build      binario de release + instaladores
#   make install    instala en ~/.local
#
# Todo se instala en el home del usuario, sin sudo. Cambia PREFIX si quieres otra ruta.

PREFIX  ?= $(HOME)/.local
BINDIR   = $(PREFIX)/bin
APPDIR   = $(PREFIX)/share/applications
ICONDIR  = $(PREFIX)/share/icons/hicolor

APP        = dopple-app
BINARIO    = app/src-tauri/target/release/$(APP)
ICONOS     = app/src-tauri/icons
ESCRITORIO = $(APPDIR)/$(APP).desktop

.DEFAULT_GOAL := help
.PHONY: help dev build check run install uninstall clean _exigir-build

help:
	@echo "Dopple — objetivos disponibles:"
	@echo ""
	@echo "  make dev        Arranca en modo desarrollo (con recarga)"
	@echo "  make build      Compila release y genera AppImage, .deb y .rpm"
	@echo "  make check      Comprueba que compila, sin generar binarios"
	@echo "  make run        Ejecuta el binario de release ya compilado"
	@echo "  make install    Instala binario, lanzador e iconos"
	@echo "  make uninstall  Deshace make install"
	@echo "  make clean      Borra los artefactos de compilacion"
	@echo ""
	@echo "  PREFIX = $(PREFIX)"

dev:
	cd app && bun run tauri dev

build:
	cd app && bun run tauri build

check:
	cargo check --manifest-path core/Cargo.toml
	cargo check --manifest-path app/src-tauri/Cargo.toml
	cd app && bunx tsc

run: _exigir-build
	$(BINARIO)

install: _exigir-build
	@echo "Instalando en $(PREFIX)"
	install -Dm755 $(BINARIO) $(BINDIR)/$(APP)

	install -Dm644 $(ICONOS)/32x32.png      $(ICONDIR)/32x32/apps/$(APP).png
	install -Dm644 $(ICONOS)/64x64.png      $(ICONDIR)/64x64/apps/$(APP).png
	install -Dm644 $(ICONOS)/128x128.png    $(ICONDIR)/128x128/apps/$(APP).png
	install -Dm644 $(ICONOS)/128x128@2x.png $(ICONDIR)/256x256/apps/$(APP).png
	install -Dm644 $(ICONOS)/icon.png       $(ICONDIR)/512x512/apps/$(APP).png

	@mkdir -p $(APPDIR)
	@printf '%s\n' \
	  '[Desktop Entry]' \
	  'Type=Application' \
	  'Version=1.0' \
	  'Name=Dopple' \
	  'Comment=Detector de archivos duplicados' \
	  'Exec=$(BINDIR)/$(APP)' \
	  'Icon=$(APP)' \
	  'Terminal=false' \
	  'Categories=Utility;Filesystem;' \
	  'StartupWMClass=$(APP)' \
	  > $(ESCRITORIO)

	@update-desktop-database $(APPDIR) 2>/dev/null || true
	@gtk-update-icon-cache -f -t $(ICONDIR) 2>/dev/null || true
	@echo "Hecho. Busca 'Dopple' en el lanzador de aplicaciones."

uninstall:
	rm -f $(BINDIR)/$(APP)
	rm -f $(ESCRITORIO)
	rm -f $(ICONDIR)/32x32/apps/$(APP).png
	rm -f $(ICONDIR)/64x64/apps/$(APP).png
	rm -f $(ICONDIR)/128x128/apps/$(APP).png
	rm -f $(ICONDIR)/256x256/apps/$(APP).png
	rm -f $(ICONDIR)/512x512/apps/$(APP).png
	@update-desktop-database $(APPDIR) 2>/dev/null || true
	@gtk-update-icon-cache -f -t $(ICONDIR) 2>/dev/null || true
	@echo "Desinstalado."

clean:
	cd app && rm -rf dist
	cargo clean --manifest-path core/Cargo.toml
	cargo clean --manifest-path app/src-tauri/Cargo.toml

# Comprobacion reutilizable: varios objetivos necesitan el binario ya compilado.
_exigir-build:
	@test -x $(BINARIO) || { \
	  echo "No existe $(BINARIO)"; \
	  echo "Ejecuta 'make build' primero."; \
	  exit 1; \
	}
