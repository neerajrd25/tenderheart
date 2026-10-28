import { useState } from 'react';
import {
  Alert, Box, Button, Collapse, Dialog, DialogActions, DialogContent, DialogTitle,
  Divider, Stack, TextField, Typography,
} from '@mui/material';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import ContactPhoneIcon from '@mui/icons-material/ContactPhone';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ChoiceChips from './ChoiceChips.jsx';
import { createChild } from '../api/children.js';

const EMPTY_FORM = {
  name: '',
  dateOfBirth: '',
  gender: 'female',
  parentName: '',
  parentEmail: '',
  parent2Name: '',
  parent2Email: '',
  ecName: '',
  ecPhone: '+91',
  ecRelationship: '',
  photo: '',
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// +91 followed by exactly 10 digits
const PHONE_PATTERN = /^\+91[0-9]{10}$/;
const GENDER_LABELS = { Girl: 'female', Boy: 'male', Other: 'other' };

export default function AddChildDialog({ open, onClose, onCreated }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [showParent2, setShowParent2] = useState(false);
  const [showEC, setShowEC] = useState(false);

  function setField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => { const next = { ...prev }; delete next[field]; return next; });
  }

  function toggleParent2() {
    if (showParent2) {
      setForm((prev) => ({ ...prev, parent2Name: '', parent2Email: '' }));
      setErrors((prev) => { const n = { ...prev }; delete n.parent2Name; delete n.parent2Email; return n; });
    }
    setShowParent2((v) => !v);
  }

  function toggleEC() {
    if (showEC) {
      setForm((prev) => ({ ...prev, ecName: '', ecPhone: '+91', ecRelationship: '' }));
      setErrors((prev) => { const n = { ...prev }; delete n.ecPhone; return n; });
    }
    setShowEC((v) => !v);
  }

  function validate() {
    const next = {};
    if (!form.name.trim()) next.name = "Enter the child's name";
    if (!form.dateOfBirth) next.dateOfBirth = 'Select the date of birth';
    else if (new Date(form.dateOfBirth) > new Date()) next.dateOfBirth = 'Date of birth cannot be in the future';
    if (!form.parentName.trim()) next.parentName = "Enter the parent's name";
    if (!EMAIL_PATTERN.test(form.parentEmail.trim())) next.parentEmail = 'Enter a valid email address';

    // Second parent: email required when name is filled
    if (showParent2 && form.parent2Name.trim() && !EMAIL_PATTERN.test(form.parent2Email.trim())) {
      next.parent2Email = 'Enter a valid email for the second parent';
    }

    // Emergency contact phone validation
    if (showEC && form.ecPhone && form.ecPhone !== '+91') {
      if (!PHONE_PATTERN.test(form.ecPhone.replace(/\s/g, ''))) {
        next.ecPhone = 'Enter +91 followed by 10 digits';
      }
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleClose() {
    if (saving) return;
    setForm(EMPTY_FORM);
    setErrors({});
    setFormError('');
    setShowParent2(false);
    setShowEC(false);
    onClose();
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError('');
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        dateOfBirth: form.dateOfBirth,
        gender: form.gender,
        parentName: form.parentName.trim(),
        parentEmail: form.parentEmail.trim().toLowerCase(),
        photo: form.photo.trim() || undefined,
        parent2Name: (showParent2 && form.parent2Name.trim()) || undefined,
        parent2Email: (showParent2 && form.parent2Email.trim().toLowerCase()) || undefined,
        emergencyContact:
          showEC && (form.ecName.trim() || (form.ecPhone && form.ecPhone !== '+91') || form.ecRelationship.trim())
            ? {
              name: form.ecName.trim(),
              phone: form.ecPhone.replace(/\s/g, ''),
              relationship: form.ecRelationship.trim(),
            }
            : undefined,
      };
      await createChild(payload);
      setForm(EMPTY_FORM);
      setShowParent2(false);
      setShowEC(false);
      onCreated();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Could not add child. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  const genderLabel = Object.keys(GENDER_LABELS).find((key) => GENDER_LABELS[key] === form.gender);

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="xs" scroll="paper">
      <Box component="form" onSubmit={handleSubmit} noValidate sx={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <DialogTitle sx={{ pt: 2.5, pb: 1 }}>
          <Box sx={{ display: { xs: 'block', sm: 'none' }, width: 40, height: 4, borderRadius: 2, bgcolor: 'divider', mx: 'auto', mb: 1.5 }} />
          <Typography variant="h6" component="span">Add a child</Typography>
        </DialogTitle>

        <DialogContent sx={{ pt: '8px !important' }}>
          <Stack spacing={2}>
            {formError && <Alert severity="error">{formError}</Alert>}

            {/* ── Child info ── */}
            <TextField
              label="Child's full name"
              required fullWidth autoComplete="off" autoCapitalize="words"
              value={form.name} error={!!errors.name} helperText={errors.name}
              onChange={(e) => setField('name', e.target.value)}
            />
            <TextField
              label="Date of birth" type="date" required fullWidth
              slotProps={{ inputLabel: { shrink: true } }}
              value={form.dateOfBirth} error={!!errors.dateOfBirth} helperText={errors.dateOfBirth}
              onChange={(e) => setField('dateOfBirth', e.target.value)}
            />
            <ChoiceChips
              label="Gender" options={Object.keys(GENDER_LABELS)} value={genderLabel}
              onChange={(label) => setField('gender', GENDER_LABELS[label])}
            />

            <Divider />

            {/* ── Primary parent ── */}
            <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.8 }}>
              Parent / Guardian
            </Typography>
            <TextField
              label="Parent's full name"
              required fullWidth autoComplete="off" autoCapitalize="words"
              value={form.parentName} error={!!errors.parentName} helperText={errors.parentName}
              onChange={(e) => setField('parentName', e.target.value)}
            />
            <TextField
              label="Parent's email" type="email" required fullWidth autoComplete="off" autoCapitalize="none"
              slotProps={{ htmlInput: { inputMode: 'email' } }}
              value={form.parentEmail} error={!!errors.parentEmail}
              helperText={errors.parentEmail || 'Daily report is sent here'}
              onChange={(e) => setField('parentEmail', e.target.value)}
            />

            {/* ── Second parent toggle ── */}
            <Button
              size="small"
              startIcon={<PersonAddIcon />}
              endIcon={showParent2 ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              onClick={toggleParent2}
              sx={{ alignSelf: 'flex-start', textTransform: 'none', fontWeight: 600 }}
            >
              {showParent2 ? 'Remove second parent' : '+ Add second parent'}
            </Button>

            <Collapse in={showParent2} unmountOnExit>
              <Stack spacing={2}>
                <TextField
                  label="Second parent's full name"
                  fullWidth autoComplete="off" autoCapitalize="words"
                  value={form.parent2Name} error={!!errors.parent2Name} helperText={errors.parent2Name}
                  onChange={(e) => setField('parent2Name', e.target.value)}
                />
                <TextField
                  label="Second parent's email" type="email" fullWidth autoComplete="off" autoCapitalize="none"
                  slotProps={{ htmlInput: { inputMode: 'email' } }}
                  value={form.parent2Email} error={!!errors.parent2Email}
                  helperText={errors.parent2Email || 'Will be CC\'d on daily reports'}
                  onChange={(e) => setField('parent2Email', e.target.value)}
                />
              </Stack>
            </Collapse>

            {/* ── Emergency contact toggle ── */}
            <Button
              size="small"
              startIcon={<ContactPhoneIcon />}
              endIcon={showEC ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              onClick={toggleEC}
              sx={{ alignSelf: 'flex-start', textTransform: 'none', fontWeight: 600 }}
            >
              {showEC ? 'Remove emergency contact' : '+ Add emergency contact'}
            </Button>

            <Collapse in={showEC} unmountOnExit>
              <Stack spacing={2}>
                <TextField
                  label="Contact's full name"
                  fullWidth autoComplete="off" autoCapitalize="words"
                  value={form.ecName}
                  onChange={(e) => setField('ecName', e.target.value)}
                />
                <TextField
                  label="Phone number"
                  fullWidth autoComplete="off"
                  slotProps={{ htmlInput: { inputMode: 'numeric', maxLength: 14 } }}
                  value={form.ecPhone} error={!!errors.ecPhone} helperText={errors.ecPhone || '+91 followed by 10 digits'}
                  onChange={(e) => {
                    const val = e.target.value;
                    // Always keep +91 prefix
                    if (!val.startsWith('+91')) return;
                    // Only allow digits after +91
                    const digits = val.slice(3).replace(/\D/g, '');
                    setField('ecPhone', '+91' + digits);
                  }}
                />
                <TextField
                  label="Relationship"
                  fullWidth autoComplete="off" autoCapitalize="words"
                  placeholder="e.g. Grandmother, Uncle"
                  value={form.ecRelationship}
                  onChange={(e) => setField('ecRelationship', e.target.value)}
                />
              </Stack>
            </Collapse>

            <Divider />

            {/* ── Photo ── */}
            <TextField
              label="Photo link (optional)" type="url" fullWidth autoComplete="off"
              slotProps={{ htmlInput: { inputMode: 'url' } }}
              value={form.photo} onChange={(e) => setField('photo', e.target.value)}
              placeholder="https://…"
            />
          </Stack>
        </DialogContent>

        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={handleClose} disabled={saving} size="large" sx={{ flex: 1 }}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" size="large" disabled={saving} sx={{ flex: 2 }}>
            {saving ? 'Adding…' : 'Add child'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
