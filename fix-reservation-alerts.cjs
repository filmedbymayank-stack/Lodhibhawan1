const fs = require('fs');
let code = fs.readFileSync('src/components/Reservation.tsx', 'utf8');

code = code.replace(/alert\("Please fill in all details."\);/g, 'setError("Please fill in all details.");');
code = code.replace(/alert\('There was an error submitting your reservation. Please try again later.'\);/g, 'setError("There was an error submitting your reservation. Please try again later.");');

code = code.replace(/const \[isSubmitting, setIsSubmitting\] = useState\(false\);/, 'const [isSubmitting, setIsSubmitting] = useState(false);\n  const [error, setError] = useState("");');

// Add error display above the form
code = code.replace(/<form className="grid grid-cols-1 md:grid-cols-2 gap-6" onSubmit=\{handleSubmit\}>/, '{error && <div className="md:col-span-2 text-red-500 text-sm mb-4 border border-red-500/30 bg-red-500/10 p-3">{error}</div>}\n            <form className="grid grid-cols-1 md:grid-cols-2 gap-6" onSubmit={handleSubmit}>');

// Make name input required
code = code.replace(/type="text" \n                  value=\{formData.name\}/, 'type="text" required\n                  value={formData.name}');

// Make phone input required
code = code.replace(/type="tel" \n                  value=\{formData.phone\}/, 'type="tel" required\n                  value={formData.phone}');

// Make datetime input required
code = code.replace(/type="datetime-local" \n                  value=\{formData.datetime\}/, 'type="datetime-local" required\n                  value={formData.datetime}');

// Reset error on submit
code = code.replace(/const handleSubmit = async \(e: any\) => \{/, 'const handleSubmit = async (e: any) => {\n    setError("");');

fs.writeFileSync('src/components/Reservation.tsx', code);
