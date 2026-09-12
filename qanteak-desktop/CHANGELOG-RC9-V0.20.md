# Qanteak OS RC9 V0.20

Free workspace foundations release.

## Added

- New **Workspace** area inserted beside Documents in the main navigation.
- Structured custom databases stored locally on the device with no paid external service requirement.
- Database **Table**, **Board**, and **Calendar** views.
- Database row creation with name, status/stage, owner, and date fields.
- Goals / OKRs with owner, due date, and live progress tracking.
- Built-in reusable templates for a simple CRM, content calendar, hiring pipeline, and quarterly goals.
- Custom workspace template creation.
- Local activity history for foundation actions.
- Local workspace insights/brief calculated from Qanteak data without calling a paid model provider.
- JSON export for the V0.20 workspace foundation data.
- Responsive desktop/mobile styles for the new workspace surfaces.

## Release constraints

- These V0.20 foundation features intentionally avoid paid AI providers, email providers, code-signing credentials, and other paid services.
- Existing RC9 V0.19 cloud recovery, permissions, documents, files, business tools, automations, and Qanteak AI architecture remain in place.
- The V0.20 foundation module uses its own local storage namespace so it can ship without destabilizing the existing cloud snapshot format. Cloud unification is a later migration step.

## Still external / credential dependent

- Trusted Windows code-signing certificate and signing credentials.
- Production AI model usage at scale.
- Production email delivery and any paid third-party integrations that require commercial credentials.
