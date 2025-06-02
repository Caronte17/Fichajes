# Sistema de Fichajes y Ausencias

Este proyecto es una aplicación web para la gestión de fichajes de empleados y control de ausencias (vacaciones y bajas laborales). Permite a los empleados registrar sus entradas y salidas, solicitar vacaciones o bajas, y a los administradores gestionar y exportar los datos.

## Características
- Registro de fichajes de entrada y salida
- Solicitud y gestión de ausencias (vacaciones y bajas)
- Cálculo automático de horas trabajadas mensuales y anuales
- Exportación de registros a Excel y PDF
- Panel de administración para gestión de usuarios y fichajes
- Interfaz moderna y responsive (Bootstrap)
- Autenticación de usuarios y roles (empleado/admin)

## Tecnologías utilizadas
- **Frontend:** HTML5, CSS3, JavaScript (ES6), Bootstrap 5, Flatpickr, jsPDF, SheetJS (XLSX)
- **Backend:** PHP (APIs REST), MySQL (estructura pensada para ello)

## Requisitos previos
- Servidor web local (XAMPP, WAMP, MAMP, etc.)
- PHP 7.4+
- MySQL (opcional, para datos reales)

## Instalación
1. Clona este repositorio en tu servidor local:
   ```
   git clone https://github.com/tuusuario/tu-repo-fichajes.git
   ```
2. Coloca la carpeta en el directorio de tu servidor web (por ejemplo, `htdocs` en XAMPP).
3. Asegúrate de tener PHP habilitado y configurado.
4. (Opcional) Configura la base de datos MySQL si quieres usar datos persistentes.
5. Accede a `http://localhost/fichajes` en tu navegador.

## Uso
- Regístrate como empleado o inicia sesión con un usuario existente.
- Usa los botones rápidos para fichar entrada/salida o solicitar ausencias.
- Los administradores pueden ver y gestionar todos los registros.
- Exporta los datos de la tabla a Excel o PDF con los botones correspondientes.

## Notas sobre privacidad
- **Este proyecto es para fines educativos.** Los datos de ejemplo y usuarios son ficticios.
- No almacenes datos personales reales en este entorno.

## Licencia
MIT 