import type { ErrorHandler, ValidationError } from '../../../dist/types/index.js';

export default function customErrorHandler(): ErrorHandler {
  return async (error: ValidationError) => {
    console.log('❌ 🎯 Custom Error Handler Activated!');
    console.log('');
    console.log('🔴 Profile creation failed due to validation errors:');
    console.log('');

    if (error.issues && error.issues.length > 0) {
      for (const issue of error.issues) {
        const field = issue.path.length > 0 ? issue.path.join('.') : 'unknown';

        // フィールド別のカスタムメッセージ
        switch (field) {
          case 'username':
            console.log(`👤 Username Error: ${issue.message}`);
            break;
          case 'age':
            console.log(`🎂 Age Error: ${issue.message}`);
            break;
          case 'role':
            console.log(`🏷️  Role Error: ${issue.message}`);
            break;
          default:
            console.log(`❗ ${field}: ${issue.message}`);
        }
      }
    } else {
      console.log(`❗ ${error.message}`);
    }

    console.log('');
    console.log('💡 Usage Examples:');
    console.log('   test custom-error "john123" "25" "admin"');
    console.log('   test custom-error --username "alice" --age "30" --role "user"');
    console.log('   test custom-error "guest_user" "20" "guest"');
    console.log('');
    console.log('📋 Valid roles: admin, user, guest');
    console.log('📏 Username: 3-20 characters');
    console.log('🎂 Age: 18-120 years');

    process.exit(1);
  };
}