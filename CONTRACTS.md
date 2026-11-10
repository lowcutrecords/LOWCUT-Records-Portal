# Gestión de contratos individuales

Implementación coordinada con `lowcutrecords/LOWCUT-Contratos-Template`.

- Cada contrato tiene ID, enlace, artista o email invitado, estado (`pending`/`signed`) y disponibilidad (`active`) propios. Los documentos anteriores sin `active` se consideran habilitados.
- El editor permite modificar los pendientes, su URL y el texto completo ES/EN. Si ambos textos están vacíos, la página usa el texto original del template. Si se personaliza, completar ambos idiomas; las tarjetas de porcentajes del template se ocultan para no contradecir el texto personalizado.
- Los cambios de título conservan el ID y el enlace. Se rechaza sobrescribir accidentalmente un ID existente. Las escrituras transaccionales evitan editar un contrato que fue firmado mientras el admin tenía abierto el formulario.
- Los estados se actualizan en vivo. El artista y el admin abren la misma página; los firmados muestran la copia aceptada. Los contratos de otros artistas no se listan para el usuario.
- El admin puede desactivar un firmado, pero conserva sus datos y firma. «Crear nueva versión» crea otro contrato pendiente sin alterar el anterior.
- Los campos `status`, `artistId`, `artistIds`, `authorizedUids` y los IDs existentes se mantienen para la compatibilidad con el portal y el bot.
- El PDF automático se deja para una etapa futura; esta versión no necesita desplegar Cloud Functions.

## Aplicar las reglas

Antes de activar el registro y las firmas en producción, comparar las reglas reales de Firebase y reemplazar sus tres matches `users`, `artists` y `contracts` por `contract-profile.rules.fragment`, junto con sus funciones auxiliares. Mantener la función existente `myProfile()` y todas las reglas de otras colecciones (releases, loginLogs, publicArtists, partners, etc.). No dejar un segundo match con permisos generales que permita eludir la protección de firmados.

El fragmento usa el esquema confirmado por el propietario: `users` con `active`, `artistId`, `email`, `name`, `role`; `artists` con `active`, `name`. Añade `registrationContractId` a nuevos usuarios para comprobar la invitación. Los registros se crean con rol de artista, con email verificado y con el perfil artístico en la misma operación atómica. No hay migraciones de datos de producción incluidas.

Publicar de forma coordinada el portal y el template. Un enlace antiguo a otro repositorio o PDF se conserva; para usar este flujo debe apuntar al template con `?contract=ID`. Para contratos nuevos, dejar vacía la URL y se generará automáticamente.

## Pruebas locales

Requiere Node 22 y Java para el emulador. Ejecutar `npm install`, luego `npm test`. Se utiliza el proyecto local ficticio `demo-lowcut-contracts`, puerto 8099; no se usa Firebase de producción.

Las pruebas comprueban invitaciones verificadas, registro atómico y asignación, lectura por usuario, estado pendiente, firma, revisión del texto, bloqueo por desactivación, rechazo de escalada de permisos y conservación de firmados. La configuración `firebase.tests.json` es exclusivamente local; no usarla para desplegar reglas.

El dominio definitivo está pendiente de confirmar. Cambiar únicamente `TEMPLATE_URL` cuando el dominio ya esté operativo. No se necesita renombrar el repositorio.

